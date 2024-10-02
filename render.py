import webbrowser
import os
import subprocess
import time

# Loading the current directory
current_dir = os.path.dirname(os.path.realpath(__file__))

# Start a simple HTTP server in the current directory
print("Starting the HTTP server...")
server_process = subprocess.Popen(["python", "-m", "http.server", "8000"], cwd=current_dir)

# Give the server a second to start
time.sleep(1)

# Open the HTML file in the default web browser via localhost
print("Opening browser window...")
print("After you are done Press ctrl+C to exit\n")

html_file = "_site/render.html"
webbrowser.open(f"http://localhost:8000/{html_file}")

# Wait for the user to stop the server (can be modified to run indefinitely if needed)
try:
    server_process.wait()
except KeyboardInterrupt:
    print("Shutting down server...")
    server_process.terminate()
    print("Server shutdown successful...")
