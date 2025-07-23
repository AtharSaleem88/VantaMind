from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os
import pyodbc
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from uuid import UUID
import re

from app.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.auth.security import get_current_active_user

load_dotenv()

router = APIRouter()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
DB_SERVER = os.getenv("DB_SERVER")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY
)

EXTRA_HEADERS = {
    "HTTP-Referer": "https://your-site.com",
    "X-Title": "DeepSeek SQL Generator"
}

conn_str = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={DB_SERVER};DATABASE={DB_NAME};"
    + (f"UID={DB_USER};PWD={DB_PASSWORD};" if DB_USER else "Trusted_Connection=yes;")
)

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
except Exception as e:
    print("[ERROR] Database connection error:", e)
    cursor = None

def clean_sql(raw_sql: str) -> str:
    raw_sql = re.sub(r"```sql|```", "", raw_sql, flags=re.IGNORECASE).strip()
    raw_sql = re.sub(r"^SQL:\s*", "", raw_sql, flags=re.IGNORECASE).strip()
    raw_sql = re.sub(r"\*\*", "", raw_sql)
    raw_sql = raw_sql.replace("`", "")
    return raw_sql

class Question(BaseModel):
    message: str
    conversation_id: Optional[UUID] = None

class ConversationUpdate(BaseModel):
    title: str

@router.post("/ask")
async def ask(
    question: Question,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    print("/ask called with user_id:", current_user.UserId, "conversation_id:", question.conversation_id)
    if not cursor:
        raise HTTPException(status_code=500, detail="Database not connected")

    user_input = question.message.strip()
    if not user_input:
        raise HTTPException(status_code=400, detail="Empty question provided.")

    conversation_id = question.conversation_id
    if not conversation_id:
        conversation = Conversation(
            UserId=current_user.UserId,
            Title=user_input[:100],
            StartedAt=datetime.utcnow()
        )
        db.add(conversation)
        db.flush()
        db.commit()
        db.refresh(conversation)
        conversation_id = conversation.ConversationId

    message = Message(
        ConversationId=conversation_id,
        Sender="user",
        Content=user_input,
        CreatedAt=datetime.utcnow()
    )
    db.add(message)
    db.commit()

    cursor.execute("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS")
    schema_data = cursor.fetchall()
    tables = {}
    for row in schema_data:
        table, column = row
        tables.setdefault(table, []).append(column)

    schema_description = "\n".join([
        f"Table [{table}]: " + ", ".join(f"[{col}]" for col in columns)
        for table, columns in tables.items()
    ])

    prompt = f"""
You are a helpful and intelligent assistant that converts user questions into SQL Server queries AND explains the output in plain English.

You ONLY work with the schema below. Use correct T-SQL (SQL Server) syntax.

Schema:
{schema_description}

Follow these strict rules:
1. If the user asks a question about data, write the correct SQL query using only the tables and columns above.
2. Never include ID fields unless the user asks for them.
3. Use square brackets [ ] for table and column names — never backticks.
4. If the question is analytical (e.g. \"why\"), generate diagnostic SQL.
5. If the question is casual or unrelated to data, reply in plain English.
6. You must always return BOTH:
   - SQL: <a clean T-SQL query>
   - TEXT: <a clear sentence that describes what the SQL does and what the user will learn>

Format your response exactly like this:
SQL: <SQL query here>

TEXT: <natural language explanation here>

Do NOT include anything else — no commentary or markdown.

Question: \"{user_input}\"

Response:
"""

    try:
        completion = client.chat.completions.create(
            model="deepseek/deepseek-chat-v3-0324:free",
            messages=[
                {"role": "system", "content": "You convert user questions into SQL Server queries or helpful text answers."},
                {"role": "user", "content": prompt}
            ],
            extra_headers=EXTRA_HEADERS
        )

        model_response = completion.choices[0].message.content.strip()
        print("Model response:", model_response)

        sql, natural_text = None, ""
        if model_response.startswith("TEXT:"):
            natural_text = model_response.replace("TEXT:", "").strip()
            final_output = natural_text

        elif "SQL:" in model_response:
            sql_match = re.search(r'SQL:\s*(.*?)(?:TEXT:|$)', model_response, re.DOTALL)
            text_match = re.search(r'TEXT:\s*(.*)', model_response, re.DOTALL)

            sql = clean_sql(sql_match.group(1)) if sql_match else None
            natural_text = text_match.group(1).strip() if text_match else ""

            if not sql:
                raise ValueError("SQL block missing.")

            sql = re.sub(r"\[Order\]\.\[TipAmount\] / \[Order\]\.\[TotalAmount\]", "[Order].[TipAmount] / NULLIF([Order].[TotalAmount], 0)", sql, flags=re.IGNORECASE)
            sql = re.sub(r"\[OrderStatus\] = 'Completed'", "[OrderStatus] = 1", sql, flags=re.IGNORECASE)
            sql = re.sub(r"\[PaymentStatus\] = 'Paid'", "[PaymentStatus] = 2", sql, flags=re.IGNORECASE)

            cursor.execute(sql)
            columns = [col[0] for col in cursor.description if col[0].lower() != "id"]
            rows = cursor.fetchall()

            if not rows:
                final_output = "No data found."
            elif len(rows) == 1:
                single_row = {k: (str(v) if v is not None else '') for k, v in zip(columns, rows[0])}
                facts = ", ".join([f"{k}: {v}" for k, v in single_row.items()])
                explain_prompt = f"""
You are a helpful assistant. Turn the following database result into a clear, meaningful sentence that explains it to a business user.

Result:
{facts}

Explanation:"""
                explain_completion = client.chat.completions.create(
                    model="deepseek/deepseek-chat-v3-0324:free",
                    messages=[
                        {"role": "system", "content": "You explain database query results in plain English."},
                        {"role": "user", "content": explain_prompt}
                    ],
                    extra_headers=EXTRA_HEADERS
                )
                explanation = explain_completion.choices[0].message.content.strip()
                final_output = explanation
                natural_text = explanation
            else:
                final_output = "\n".join([
                    f"{i + 1}. " + " – ".join([f"{k}: {str(v) if v is not None else ''}" for k, v in zip(columns, row)])
                    for i, row in enumerate(rows[:10])
                ])
        else:
            raise ValueError("Response format invalid.")

        bot_msg = Message(
            ConversationId=conversation_id,
            Sender="bot",
            Content=natural_text or final_output,
            CreatedAt=datetime.utcnow()
        )
        db.add(bot_msg)
        db.commit()

        return {
            "sql": sql,
            "summary": natural_text,
            "result": final_output,
            "conversation_id": conversation_id
        }

    except Exception as e:
        print("[ERROR]", str(e))
        db.add(Message(
            ConversationId=conversation_id,
            Sender="bot",
            Content=f"Error: {str(e)}",
            CreatedAt=datetime.utcnow()
        ))
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations")
def list_user_conversations(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    conversations = db.query(Conversation).filter(Conversation.UserId == current_user.UserId).order_by(Conversation.StartedAt.desc()).all()
    return [{
        "conversationId": conv.ConversationId,
        "title": conv.Title,
        "startedAt": conv.StartedAt
    } for conv in conversations]


@router.get("/conversations/{conversation_id}")
def get_conversation_details(conversation_id: UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(
        Conversation.ConversationId == conversation_id,
        Conversation.UserId == current_user.UserId
    ).first()

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    messages = db.query(Message).filter(
        Message.ConversationId == conversation_id
    ).order_by(Message.CreatedAt).all()

    return {
        "conversationId": conv.ConversationId,
        "title": conv.Title,
        "startedAt": conv.StartedAt,
        "messages": [
            {
                "messageId": msg.MessageId,
                "sender": msg.Sender,
                "content": msg.Content,
                "createdAt": msg.CreatedAt
            } for msg in messages
        ]
    }


@router.put("/conversations/{conversation_id}")
def update_conversation_title(conversation_id: UUID, update: ConversationUpdate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(
        Conversation.ConversationId == conversation_id,
        Conversation.UserId == current_user.UserId
    ).first()

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    conv.Title = update.title
    db.commit()
    return {"message": "Title updated successfully."}


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(
        Conversation.ConversationId == conversation_id,
        Conversation.UserId == current_user.UserId
    ).first()

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    db.query(Message).filter(Message.ConversationId == conversation_id).delete()
    db.delete(conv)
    db.commit()
    return {"message": "Conversation and its messages deleted successfully."}
