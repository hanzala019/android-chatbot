from flask import Flask, request, jsonify
from datetime import datetime
from flask_cors import CORS
import os
import pymysql
from dotenv import load_dotenv


load_dotenv()  # Load variables from .env file

# Configure OpenAI (SambaNova API)
import openai
openai.api_key = os.getenv("OPENAI_API_KEY")  # Use environment variables for security
base_url = os.getenv("OPENAI_BASE_URL", "https://api.sambanova.ai/v1")  # Default to SambaNova's base URL

# Function to interact with the OpenAI Llama model
def askLlama(chunk):
    response = openai.ChatCompletion.create(
        model="Meta-Llama-3.1-70B-Instruct",
        messages=[
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user", "content": chunk},
        ],
        temperature=0.1,
        top_p=0.1,
    )
    return response.choices[0].message.content

# Flask app setup
app = Flask(__name__)
CORS(app)

# Database configuration
timeout = 10
connection = pymysql.connect(
    charset="utf8mb4",
    connect_timeout=timeout,
    cursorclass=pymysql.cursors.DictCursor,
    db=os.getenv("DB_NAME"),  # Environment variable for DB name
    host=os.getenv("DB_HOST"),  # Environment variable for DB host
    password=os.getenv("DB_PASSWORD"),  # Environment variable for DB password
    read_timeout=timeout,
    port=int(os.getenv("DB_PORT", 3306)),  # Default to port 3306
    user=os.getenv("DB_USER"),  # Environment variable for DB user
    write_timeout=timeout,
)

# Database helper functions
def getAll(query, params=None):
    with connection.cursor() as cursor:
        cursor.execute(query, params) if params else cursor.execute(query)
        return cursor.fetchall()

def insert(query, values):
    with connection.cursor() as cursor:
        cursor.execute(query, values)
        connection.commit()

def delete(query, params):
    with connection.cursor() as cursor:
        cursor.execute(query, params)
        connection.commit()

def rename(query, values):
    with connection.cursor() as cursor:
        cursor.execute(query, values)
        connection.commit()

# Routes
@app.route("/home", methods=["GET"])
def index():
    sessions = getAll("SELECT id, name FROM sessions")
    return jsonify({"success": True, "sessions": sessions}), 200

@app.route("/new_chat", methods=["POST"])
def new_chat():
    chatname = request.json.get("chatname")
    if not chatname:
        return jsonify({"error": "Chat name is required"}), 400
    insert("INSERT INTO sessions (name) VALUES (%s)", (chatname,))
    return jsonify({"success": True}), 200

@app.route("/delete_chat", methods=["POST"])
def delete_chat():
    session_id = request.json.get("session_id")
    if not session_id:
        return jsonify({"error": "Session ID not provided"}), 400
    delete("DELETE FROM sessions WHERE id = %s", (session_id,))
    return jsonify({"success": True}), 200

@app.route("/rename_chat", methods=["POST"])
def rename_chat():
    session_id = request.json.get("session_id")
    new_name = request.json.get("new_name")
    if not session_id or not new_name:
        return jsonify({"error": "Session ID or new name not provided"}), 400
    rename("UPDATE sessions SET name = %s WHERE id = %s", (new_name, session_id))
    return jsonify({"success": True}), 200

@app.route("/send_message", methods=["POST"])
def send_message():
    then = datetime.now()
    session_id = request.json.get("session_id")
    message = request.json.get("message")
    if not session_id or not message:
        return jsonify({"error": "Session ID or message not provided"}), 400

    history = getAll("SELECT userText, modelText FROM chat WHERE sessionId = %s", (session_id,))
    history_formatted = [{"userPrompt": h["userText"], "System": h["modelText"]} for h in history]

    mesg = f"""
        "PreviousConversation": {history_formatted},
        "UserPrompt": {message}
    """
    response = askLlama(mesg)

    now = datetime.now()
    elapsed_time = int((now - then).total_seconds())

    insert(
        "INSERT INTO chat (sessionid, userText, modelText, context, time) VALUES (%s, %s, %s, %s, %s)",
        (session_id, message, response, "android", elapsed_time),
    )
    return jsonify({"success": True, "session_id": session_id, "response": response}), 200

@app.route("/conversation", methods=["POST"])
def conversation():
    session_id = request.json.get("session_id")
    if not session_id:
        return jsonify({"error": "Session ID not provided"}), 400
    results = getAll("SELECT * FROM chat WHERE sessionId = %s", (session_id,))
    return jsonify({"success": True, "session_id": session_id, "results": results}), 200

# Start the app
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)))  # Use PORT env variable for Render
