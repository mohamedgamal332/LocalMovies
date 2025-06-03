import os
import json
import sys
import threading
import webbrowser
from flask import Flask, render_template, request, jsonify, send_from_directory, abort
from werkzeug.utils import secure_filename
import tkinter as tk
from tkinter import filedialog

# --- Configuration ---
PORT = 5858  # Choose an uncommon port
VIDEO_EXTENSIONS = {'.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv', '.wmv'}
STATE_FILE = 'state.json'

# --- Flask App Setup ---
app = Flask(__name__)
app.config['CURRENT_VIDEO_DIRECTORY'] = None
app.config['CURRENT_VIDEO_FILES'] = []

# --- Helper Functions ---
def get_video_files(directory):
    """Scans a directory for video files and sorts them."""
    files = []
    if directory and os.path.isdir(directory):
        for f in sorted(os.listdir(directory)):
            if os.path.splitext(f)[1].lower() in VIDEO_EXTENSIONS:
                files.append(f)
    return files

def load_state():
    """Loads playback state from state.json."""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {} # Corrupted file
    return {}

def save_state(data):
    """Saves playback state to state.json."""
    try:
        current_state = load_state()
        # Only update relevant keys, don't overwrite everything unless necessary
        # This helps if multiple instances or parts of the app manage state
        if 'directory' in data: # If a new directory is selected, reset specific fields
            current_state = {'directory': data.get('directory')} # Reset others for new dir
        
        current_state['currentVideoIndex'] = data.get('currentVideoIndex', current_state.get('currentVideoIndex'))
        current_state['currentTime'] = data.get('currentTime', current_state.get('currentTime'))
        
        with open(STATE_FILE, 'w') as f:
            json.dump(current_state, f, indent=4)
    except Exception as e:
        print(f"Error saving state: {e}")


# --- Flask Routes ---
@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/select_directory', methods=['POST'])
def select_directory_route():
    """Opens a native directory dialog and sets the video directory."""
    # This needs to run in the main thread if tkinter is involved
    # For Flask, it's tricky. A common workaround is to signal main thread or use a queue.
    # Simpler for local app: run tkinter in a separate thread that communicates back.
    # However, tkinter dialogs are typically blocking.
    # Best approach for a local utility: Do it directly and block, user expects this.
    
    # Tkinter dialog must run in the main thread if Python interpreter was started without a specific GUI loop.
    # Flask dev server runs in a separate thread. This can be problematic.
    # A workaround is to make the call, then "restart" the data flow client-side.
    
    # For this local utility, let's try to run it directly.
    # It might show a warning or error if Flask is in a non-main thread,
    # but often works for simple dialogs.
    root = tk.Tk()
    root.withdraw() # Hide the main tkinter window
    directory = filedialog.askdirectory(title="Select Video Directory")
    root.destroy()

    if directory:
        app.config['CURRENT_VIDEO_DIRECTORY'] = directory
        app.config['CURRENT_VIDEO_FILES'] = get_video_files(directory)
        save_state({'directory': directory, 'currentVideoIndex': 0, 'currentTime': 0}) # Reset state for new dir
        return jsonify({
            'success': True,
            'directoryName': os.path.basename(directory),
            'videos': app.config['CURRENT_VIDEO_FILES']
        })
    return jsonify({'success': False, 'message': 'No directory selected.'})

@app.route('/videos')
def get_videos_route():
    """Returns the list of video files in the current directory."""
    if not app.config['CURRENT_VIDEO_DIRECTORY']:
        return jsonify({'error': 'No directory selected', 'videos': []}), 400
    return jsonify({
        'directoryName': os.path.basename(app.config['CURRENT_VIDEO_DIRECTORY']),
        'videos': app.config['CURRENT_VIDEO_FILES']
    })

@app.route('/video/<path:filename>')
def serve_video(filename):
    """Serves a specific video file."""
    directory = app.config['CURRENT_VIDEO_DIRECTORY']
    if not directory:
        abort(404, "Video directory not set.")
    
    # Sanitize filename to prevent directory traversal, though send_from_directory helps
    filename = secure_filename(filename)
    
    try:
        return send_from_directory(directory, filename, as_attachment=False)
    except FileNotFoundError:
        abort(404, f"Video file '{filename}' not found.")

@app.route('/subtitle/<path:videofilename>')
def serve_subtitle(videofilename):
    """Serves an SRT subtitle file for the given video."""
    directory = app.config['CURRENT_VIDEO_DIRECTORY']
    if not directory:
        abort(404, "Video directory not set.")

    base, _ = os.path.splitext(videofilename)
    srt_filename = base + '.srt'
    srt_filename = secure_filename(srt_filename) # Sanitize

    try:
        return send_from_directory(directory, srt_filename, mimetype='text/plain')
    except FileNotFoundError:
        # It's okay if subtitle is not found, return 404 which JS will handle gracefully
        return jsonify({'error': 'Subtitle not found'}), 404

@app.route('/state', methods=['GET', 'POST'])
def handle_state():
    """Handles saving and loading of playback state."""
    if request.method == 'POST':
        data = request.json
        save_state(data)
        return jsonify({'success': True, 'message': 'State saved.'})
    else: # GET
        state = load_state()
        # If a directory is in state, ensure it's still valid and load its files
        if state.get('directory') and os.path.isdir(state.get('directory')):
            app.config['CURRENT_VIDEO_DIRECTORY'] = state['directory']
            app.config['CURRENT_VIDEO_FILES'] = get_video_files(state['directory'])
            state['directoryName'] = os.path.basename(state['directory'])
            state['videos'] = app.config['CURRENT_VIDEO_FILES']
        else: # directory from state is invalid or not set
            state.pop('directory', None) # Remove invalid directory
            state.pop('currentVideoIndex', None)
            state.pop('currentTime', None)

        return jsonify(state)

# --- Main Execution ---
def open_browser():
    """Opens the web browser to the player URL."""
    webbrowser.open_new(f"http://127.0.0.1:{PORT}")

if __name__ == '__main__':
    print(f"Starting Local Video Player on http://127.0.0.1:{PORT}")
    print("Select a directory through the browser interface.")
    
    # Check if state file exists and pre-load directory if available
    initial_state = load_state()
    if initial_state.get('directory') and os.path.isdir(initial_state.get('directory')):
        app.config['CURRENT_VIDEO_DIRECTORY'] = initial_state['directory']
        app.config['CURRENT_VIDEO_FILES'] = get_video_files(initial_state['directory'])
        print(f"Loaded initial directory from state: {app.config['CURRENT_VIDEO_DIRECTORY']}")
    else:
        print("No valid directory found in state.json. Please select one.")

    # Open browser after a short delay to allow Flask to start
    threading.Timer(1.25, open_browser).start()
    
    # Setting use_reloader=False is important if tkinter dialog is used in a route
    # because reloader can cause issues with GUI toolkits in sub-threads.
    # For this local app, debug=False and use_reloader=False is fine for production-like run.
    app.run(host='127.0.0.1', port=PORT, debug=False, use_reloader=False)
