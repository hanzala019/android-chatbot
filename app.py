from flask import Flask, request, jsonify
from datetime import datetime
from flask_cors import CORS
import os
from dotenv import load_dotenv
import google.generativeai as genai
genai.configure(api_key="AIzaSyCJltkxManMujnMpI0vlusMDqVuUVeOxnQ")
load_dotenv()
import openai

c = openai.OpenAI(
    api_key="de6a8d51-609f-4b8f-a8a1-657f8e547af6",
    base_url=os.getenv("OPENAI_BASE_URL"),
)
def askLlama(chunk):
    response = c.chat.completions.create(
        model='Meta-Llama-3.1-70B-Instruct',
        messages=[{"role":"system","content":""" You are a helpful AI assistant  """},{"role":"user","content":f"""{chunk}"""}],
        temperature =  0.1,
        top_p = 0.1
    )
    return response.choices[0].message.content

app = Flask(__name__)
CORS(app)
# MySQL Configuration
import pymysql

timeout = 10
connection = pymysql.connect(
  charset="utf8mb4",
  connect_timeout=timeout,
  cursorclass=pymysql.cursors.DictCursor,
  host=os.getenv("DB_HOST"),
  user=os.getenv("DB_USER"),
  password=os.getenv("DB_PASSWORD"),
  database=os.getenv("DB_NAME"),
  port=int(os.getenv("DB_PORT")),
  write_timeout=timeout,
)



def getAll(query, params=None):
    cursor = connection.cursor()
    if params:
        cursor.execute(query, params)  # Execute with parameters
    else:
        cursor.execute(query)  # Execute without parameters
    results = cursor.fetchall()
    cursor.close()
    return results

def insert(query, values):
    cursor = connection.cursor()
    cursor.execute(query, values)  # Pass the query and the values separately
    connection.commit()
    cursor.close()
    return "success"

def delete(query, params):
    cursor = connection.cursor()
    try:
        cursor.execute(query, params)  # Execute query with params
        connection.commit()      # Commit the changes
    except Exception as e:
        print(f"Database error: {e}")
        connection.rollback()    # Rollback in case of error
        raise e
    finally:
        cursor.close()

def rename(query, val):
        try:
            cursor = connection.cursor()
            
            cursor.execute(query,val )  # Safely execute with parameters
            connection.commit()  # Commit changes to the database
        except Exception as e:
            print(f"Error renaming session: {e}")
            connection.rollback()  # Rollback if there's an error
            return jsonify({"error": "Error renaming session"}), 500
        finally:
            cursor.close()


@app.route("/home", methods=["GET"])
def index():
    
    sessions = getAll("SELECT id, name FROM sessions")
    
    return jsonify({"success": True, "sessions":sessions}), 200




@app.route('/new_chat', methods=['POST'])
def new_chat():
    chatname = request.json.get("chatname")

    if not chatname:
        return jsonify({"error": "Chat name is required"}), 400

    query = "INSERT INTO sessions (`name`) VALUES (%s)"
    
    try:
        insert(query, (chatname,))  # Pass query and values separately
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"success": True}), 200




@app.route('/delete_chat', methods=['POST'])
def delete_chat():
    session_id = request.json.get('session_id')
    if session_id is None:
        return jsonify({"error": "Session ID not provided"}), 400  # Handle missing session ID

    try:
        delete_query = "DELETE FROM sessions WHERE id = %s"
        delete(delete_query, (session_id,))  # Pass session_id as a tuple to avoid SQL injection
        return jsonify({"success": True}), 200
    except Exception as e:
        print(f"Error deleting session: {e}")
    
        return jsonify({"error": "Error deleting session"}), 500




@app.route('/rename_chat', methods=['POST'])
def rename_chat():
    session_id = request.json.get('session_id')
    new_name = request.json.get('new_name')
    query = "UPDATE sessions SET name = %s WHERE id = %s"
    val = (new_name, session_id)
    if not session_id or not new_name:
        return jsonify({"error": "Session ID or new name not provided"}), 400  # Handle missing data

    else:
        rename(query, val)

    return jsonify({"success": True}), 200  # Return success response

@app.route('/send_message', methods=['POST'])
def send_message():
    then = datetime.now()
    history = []
    
    session_id = request.json.get('session_id')  # Get the session ID
    message = request.json.get('message')  # Get the user message

    
    print("message from app: ", message)

    results = getAll("SELECT * from chat WHERE sessionId = %s", (session_id,))
    for result in results:
        history.append({"userPrompt": result["userText"], "System": result["modelText"]})
    
    mesg= f"""
        "PreviousConversation": {history},
        "UserPrompt": {message}
    """
    response = askLlama(mesg)

    now = datetime.now()
    time = now - then
    time = int(time.total_seconds())
    print("Time taken in seconds: ", time)

    
    # Insert user message into the chat table
    insert("INSERT INTO chat (sessionid, userText, modelText,context,time) VALUES (%s, %s, %s, %s, %s)",(session_id, message, response,"android", time))

    
    return jsonify({"success": True, "session_id": session_id, "results": results, "modelText": response}), 200  # Return the updated conversation



@app.route('/conversation', methods=['POST'])
def conversation():
    session_id = request.json.get("session_id")
    
    # Use a parameterized query instead of f-string
    results = getAll("SELECT * from chat WHERE sessionId = %s", (session_id,))
    
    return jsonify({"success": True, "session_id": session_id, "results": results}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)





