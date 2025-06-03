# Local Video Player

A simple, yet feature-rich, local video player that runs entirely on your Linux (Ubuntu) machine. It uses a Python Flask backend to serve local video files and a clean HTML/CSS/JavaScript frontend for playback and controls.

## 🎬 Core Features

*   **Local Directory Playback:** Select a local directory containing your video files (episodes, movies).
*   **Sequential Playback:** Videos play one after another in alphabetical order from the selected directory.
*   **Show/Movie Title & Episode Number:** Displays the name of the selected folder as the title and the current video number (e.g., "Episode 1 / 10").
*   **"Next Episode" Button:** Manually skip to the next video in the sequence.

## 📺 YouTube-Style Video Controls

*   **Play/Pause:** Single-click on the video or use the dedicated button.
*   **Seek Forward/Backward:** Double-click on the right/left side of the video to seek 10 seconds forward/backward respectively.
*   **Volume Control:** Adjust volume with a slider and toggle mute.
*   **Fullscreen Toggle:** Enter and exit fullscreen mode.
*   **Progress Bar:** Visual progress bar showing elapsed and total time, also clickable for seeking.

## ✨ Additional Features

*   **Resume Playback:** Remembers the last watched directory, episode, and playback position (using a local `state.json` file).
*   **Keyboard Shortcuts:**
    *   `Spacebar`: Play/Pause
    *   `Left/Right Arrow`: Seek backward/forward (5 seconds)
    *   `Up/Down Arrow`: Volume Up/Down
    *   `N`: Next Episode
    *   `F`: Toggle Fullscreen
    *   `M`: Toggle Mute
*   **Dark/Light Mode Toggle:** Switch between dark and light themes, preference saved in browser's local storage.
*   **Subtitle Support:** Automatically loads and displays `.srt` subtitle files if they share the same name as the video file (e.g., `my_video.mp4` and `my_video.srt`) in the same directory or when dropped together.
*   **Drag-and-Drop Support:**
    *   Drag a folder containing videos onto the initial prompt (requires backend modification to handle folder drops, current version supports file drops).
    *   Drag individual video files (and their SRTs) directly onto the player window or the initial prompt area to play them.
*   **Basic Error Handling:** Displays a message if a video fails to load and attempts to skip to the next one.

## 🛑 Requirements

*   **Local Operation:** Designed to work entirely offline with no external dependencies once set up.
*   **Ubuntu Linux:** Developed and tested on Ubuntu. Should work on other Linux distributions with Python and Tkinter available.
*   **Desktop Focus:** No specific mobile support or responsiveness optimizations.

## 🛠️ Project Structure
<pre>
local_video_player/
├── player.py             # Flask backend and main script to run
├── templates/
│   └── index.html        # Frontend HTML structure
├── static/
│   ├── style.css         # Frontend CSS styling
│   └── script.js         # Frontend JavaScript logic
└── state.json            # (Auto-created) Stores playback state
</pre>


## ⚙️ Setup & Installation

1.  **Prerequisites:**
    *   Python 3 (tested with 3.8+)
    *   `pip` (Python package installer)
    *   `tkinter` (for the directory selection dialog)
        ```bash
        sudo apt-get update
        sudo apt-get install python3-tk python3-pip python3-venv
        ```

2.  **Clone or Download the Repository:**
    If this were a git repo:
    ```bash
    git clone <repository_url>
    cd local_video_player
    ```
    Otherwise, create the directory structure as shown above and place the provided files (`player.py`, `index.html`, `style.css`, `script.js`) into their respective locations.

3.  **Create and Activate a Virtual Environment (Recommended):**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

4.  **Install Python Dependencies:**
    ```bash
    pip install Flask
    ```
    (Tkinter is usually part of the Python standard library if `python3-tk` is installed system-wide, but Flask is needed).

## 🚀 How to Run

1.  Navigate to the project directory:
    ```bash
    cd /path/to/local_video_player
    ```

2.  If you're using a virtual environment, ensure it's activated:
    ```bash
    source venv/bin/activate
    ```

3.  Run the Python script:
    ```bash
    python3 player.py
    ```

4.  The script will start a local web server (usually on `http://127.0.0.1:5858`) and attempt to open this URL in your default web browser.

5.  **Using the Player:**
    *   On the first run, or if no directory is set, you'll see a prompt.
    *   Click the "📁 Select Video Directory" button. A native file dialog will appear. Choose the folder containing your videos.
    *   Alternatively, drag and drop video files (and their `.srt` subtitles) onto the designated drop zone or even onto the video player area once a video is loaded.
    *   Playback will start with the first video in the selected directory (or the first dropped video).
    *   Use the on-screen controls or keyboard shortcuts to manage playback.

## 💡 Notes & Known Limitations

*   The native directory selection dialog is provided by `tkinter`.
*   Drag-and-dropping an entire *folder* onto the web interface is not directly supported by the browser in a way that allows the backend to access its path. The current drag-and-drop implementation handles *files*. The "Select Video Directory" button is the primary way to choose a folder.
*   Video format support depends on your browser's HTML5 video capabilities. Common formats like MP4 (H.264/AAC) are widely supported.
*   The `state.json` file is created in the same directory as `player.py` to store resume information.

---

Enjoy your local viewing experience!
