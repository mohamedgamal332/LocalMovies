document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const videoPlayer = document.getElementById('videoPlayer');
    const selectDirBtn = document.getElementById('selectDirBtn');
    const dropZone = document.getElementById('drop-zone');
    const videoArea = document.getElementById('video-area');
    
    const showTitleElem = document.getElementById('showTitle');
    const episodeNumberElem = document.getElementById('episodeNumber');
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeBar = document.getElementById('volumeBar');
    const progressBar = document.getElementById('progressBar');
    const timeDisplay = document.getElementById('timeDisplay');
    const nextBtn = document.getElementById('nextBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const errorMessageElem = document.getElementById('errorMessage');

    const videoWrapper = document.querySelector('.video-wrapper');
    const videoControls = document.querySelector('.video-controls');

    // --- State Variables ---
    let videoFiles = [];
    let currentVideoIndex = 0;
    let currentDirectoryName = '';
    let playbackMode = 'directory'; // 'directory' or 'dropped'
    let droppedFileObjects = []; // Used for drag-and-drop playback
    let controlsTimeout;

    // --- Helper Functions ---
    function formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    function showErrorMessage(message) {
        errorMessageElem.textContent = message;
        errorMessageElem.style.display = 'block';
        setTimeout(() => {
            errorMessageElem.style.display = 'none';
        }, 5000);
    }

    function hideErrorMessage() {
        errorMessageElem.style.display = 'none';
    }

    // --- Playback Core ---
    async function loadVideo(index) {
        hideErrorMessage();
        if (playbackMode === 'directory') {
            if (index >= 0 && index < videoFiles.length) {
                currentVideoIndex = index;
                const videoFile = videoFiles[currentVideoIndex];
                videoPlayer.src = `/video/${encodeURIComponent(videoFile)}`;
                
                // Attempt to load subtitles
                const trackElement = videoPlayer.querySelector('track');
                if (trackElement) trackElement.remove(); // Remove old track

                const srtResponse = await fetch(`/subtitle/${encodeURIComponent(videoFile)}`);
                if (srtResponse.ok) {
                    const newTrack = document.createElement('track');
                    newTrack.kind = 'subtitles';
                    newTrack.label = 'English'; // Or detect lang if possible
                    newTrack.srclang = 'en';
                    newTrack.src = `/subtitle/${encodeURIComponent(videoFile)}`; // Browser handles fetching
                    newTrack.default = true;
                    videoPlayer.appendChild(newTrack);
                    // Force reload of text tracks if needed
                    if (videoPlayer.textTracks.length > 0) {
                        for (let i = 0; i < videoPlayer.textTracks.length; i++) {
                            videoPlayer.textTracks[i].mode = 'showing'; // Or 'hidden' then 'showing'
                        }
                    }
                }
                
                showTitleElem.textContent = currentDirectoryName;
                episodeNumberElem.textContent = `Episode ${currentVideoIndex + 1} / ${videoFiles.length}`;
                updatePlayPauseButton();
            } else {
                showErrorMessage("No more videos in this directory or invalid index.");
                return;
            }
        } else if (playbackMode === 'dropped') {
            if (index >= 0 && index < droppedFileObjects.length) {
                currentVideoIndex = index;
                const file = droppedFileObjects[currentVideoIndex];
                videoPlayer.src = URL.createObjectURL(file);
                
                // Subtitle handling for dropped files:
                // User must drop video and SRT with same name (minus extension) together.
                const trackElement = videoPlayer.querySelector('track');
                if (trackElement) trackElement.remove();

                const videoBaseName = file.name.substring(0, file.name.lastIndexOf('.'));
                const srtFile = droppedFileObjects.find(f => 
                    f.name.substring(0, f.name.lastIndexOf('.')).toLowerCase() === videoBaseName.toLowerCase() &&
                    f.name.toLowerCase().endsWith('.srt')
                );

                if (srtFile) {
                    const newTrack = document.createElement('track');
                    newTrack.kind = 'subtitles';
                    newTrack.label = 'Subtitles';
                    newTrack.srclang = 'en'; // Assuming English, or could try to parse
                    newTrack.src = URL.createObjectURL(srtFile);
                    newTrack.default = true;
                    videoPlayer.appendChild(newTrack);
                     if (videoPlayer.textTracks.length > 0) {
                        for (let i = 0; i < videoPlayer.textTracks.length; i++) {
                            videoPlayer.textTracks[i].mode = 'showing';
                        }
                    }
                }

                showTitleElem.textContent = "Dropped Files";
                episodeNumberElem.textContent = `File ${currentVideoIndex + 1} / ${droppedFileObjects.length}`;
                updatePlayPauseButton();
            } else {
                showErrorMessage("No more dropped files or invalid index.");
                return;
            }
        }
        
        videoPlayer.load(); // Important for new src and tracks
        // videoPlayer.play(); // Autoplay next, or wait for user. Let's autoplay.
        // Resume functionality will override this if applicable.
        // The 'loadedmetadata' event will handle resume.
    }

    function playNext() {
        if (playbackMode === 'directory' && currentVideoIndex < videoFiles.length - 1) {
            loadVideo(currentVideoIndex + 1);
        } else if (playbackMode === 'dropped' && currentVideoIndex < droppedFileObjects.length - 1) {
            loadVideo(currentVideoIndex + 1);
        } else {
            showErrorMessage("End of playlist.");
            videoPlayer.pause(); // Stop playback
        }
    }

    // --- UI Updates ---
    function updatePlayPauseButton() {
        playPauseBtn.textContent = videoPlayer.paused ? '▶️' : '⏸️';
    }

    function updateVolumeUI() {
        volumeBtn.textContent = videoPlayer.muted || videoPlayer.volume === 0 ? '🔇' : '🔊';
        volumeBar.value = videoPlayer.muted ? 0 : videoPlayer.volume;
    }

    function updateProgressBar() {
        if (videoPlayer.duration) {
            progressBar.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
            timeDisplay.textContent = `${formatTime(videoPlayer.currentTime)} / ${formatTime(videoPlayer.duration)}`;
        } else {
            progressBar.value = 0;
            timeDisplay.textContent = `00:00 / 00:00`;
        }
    }

    // --- Event Handlers ---
    selectDirBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/select_directory', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                playbackMode = 'directory';
                droppedFileObjects = []; // Clear dropped files
                videoFiles = data.videos;
                currentDirectoryName = data.directoryName;
                if (videoFiles.length > 0) {
                    dropZone.style.display = 'none';
                    videoArea.style.display = 'block';
                    loadVideo(0); // Load first video
                    // State will be saved by backend on select_directory
                } else {
                    showErrorMessage("Selected directory contains no video files.");
                }
            } else {
                showErrorMessage(data.message || "Failed to select directory.");
            }
        } catch (error) {
            console.error("Error selecting directory:", error);
            showErrorMessage("Error communicating with server to select directory.");
        }
    });

    videoPlayer.addEventListener('play', updatePlayPauseButton);
    videoPlayer.addEventListener('pause', updatePlayPauseButton);
    videoPlayer.addEventListener('volumechange', updateVolumeUI);
    videoPlayer.addEventListener('timeupdate', () => {
        updateProgressBar();
        saveCurrentState(false); // Save frequently but don't spam backend for directory changes
    });
    videoPlayer.addEventListener('loadedmetadata', () => {
        updateProgressBar(); // Set initial duration
        // Resume playback position if available from state
        // This is now handled by loadInitialState calling applyState
    });
    videoPlayer.addEventListener('ended', playNext);
    videoPlayer.addEventListener('error', (e) => {
        console.error("Video Error:", e);
        let errorMsg = "Error loading video.";
        if (videoPlayer.error) {
            switch (videoPlayer.error.code) {
                case MediaError.MEDIA_ERR_ABORTED: errorMsg = 'Video playback aborted.'; break;
                case MediaError.MEDIA_ERR_NETWORK: errorMsg = 'A network error caused video download to fail.'; break;
                case MediaError.MEDIA_ERR_DECODE: errorMsg = 'Video decoding error.'; break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = 'Video format not supported.'; break;
                default: errorMsg = 'An unknown error occurred.';
            }
        }
        showErrorMessage(errorMsg + " Skipping to next...");
        setTimeout(playNext, 2000); // Give user time to read message
    });

    // Custom Controls Handlers
    playPauseBtn.addEventListener('click', () => videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause());
    
    let lastVolume = 1;
    volumeBtn.addEventListener('click', () => {
        if (videoPlayer.muted) {
            videoPlayer.muted = false;
            videoPlayer.volume = lastVolume > 0.05 ? lastVolume : 0.5; // Restore or set default
        } else {
            lastVolume = videoPlayer.volume;
            videoPlayer.muted = true;
        }
        updateVolumeUI();
    });

    volumeBar.addEventListener('input', (e) => {
        videoPlayer.muted = false;
        videoPlayer.volume = e.target.value;
        updateVolumeUI();
    });

    progressBar.addEventListener('input', (e) => {
        if(videoPlayer.duration) {
            videoPlayer.currentTime = (e.target.value / 100) * videoPlayer.duration;
        }
    });

    nextBtn.addEventListener('click', playNext);

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            videoWrapper.requestFullscreen().catch(err => { // Request fullscreen on wrapper
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    });
    document.addEventListener('fullscreenchange', () => {
        fullscreenBtn.textContent = document.fullscreenElement ? 'Exit ⛶' : '⛶';
    });


    // YouTube-Style Clicks on Video
    let clickTimer = null;
    videoPlayer.addEventListener('click', (e) => {
        // Ignore clicks on controls if they propagate
        if (e.target !== videoPlayer) return;

        if (clickTimer === null) {
            clickTimer = setTimeout(() => {
                clickTimer = null;
                videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause();
            }, 250); // 250ms delay to detect double click
        } else { // Double click
            clearTimeout(clickTimer);
            clickTimer = null;
            const rect = videoPlayer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            if (clickX < rect.width / 3) { // Double click on left third
                videoPlayer.currentTime -= 10;
            } else if (clickX > rect.width * (2/3)) { // Double click on right third
                videoPlayer.currentTime += 10;
            } else { // Double click on middle third - could also be play/pause or fullscreen
                 videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause(); // Or toggle fullscreen
            }
        }
    });
    
    // Show/Hide Controls
    videoWrapper.addEventListener('mouseenter', () => {
        clearTimeout(controlsTimeout);
        videoControls.classList.add('visible');
    });
    videoWrapper.addEventListener('mousemove', () => {
        clearTimeout(controlsTimeout);
        videoControls.classList.add('visible');
        controlsTimeout = setTimeout(() => {
            if (!videoPlayer.paused) { // Keep visible if paused
                 videoControls.classList.remove('visible');
            }
        }, 3000); // Hide after 3 seconds of inactivity
    });
    videoWrapper.addEventListener('mouseleave', () => {
        clearTimeout(controlsTimeout);
         if (!videoPlayer.paused) {
            videoControls.classList.remove('visible');
        }
    });
    videoPlayer.addEventListener('pause', () => { // Keep controls visible when paused
        clearTimeout(controlsTimeout);
        videoControls.classList.add('visible');
    });
     videoPlayer.addEventListener('play', () => { // Start hidetimer on play
        controlsTimeout = setTimeout(() => videoControls.classList.remove('visible'), 3000);
    });


    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        // Prevent shortcuts if typing in an input field (not relevant here, but good practice)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
            case ' ': // Spacebar
                e.preventDefault();
                videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause();
                break;
            case 'arrowleft':
                e.preventDefault();
                videoPlayer.currentTime -= 5;
                break;
            case 'arrowright':
                e.preventDefault();
                videoPlayer.currentTime += 5;
                break;
            case 'arrowup':
                e.preventDefault();
                videoPlayer.volume = Math.min(1, videoPlayer.volume + 0.1);
                updateVolumeUI();
                break;
            case 'arrowdown':
                e.preventDefault();
                videoPlayer.volume = Math.max(0, videoPlayer.volume - 0.1);
                updateVolumeUI();
                break;
            case 'n':
                e.preventDefault();
                playNext();
                break;
            case 'f': // Fullscreen
                e.preventDefault();
                fullscreenBtn.click();
                break;
            case 'm': // Mute
                e.preventDefault();
                volumeBtn.click();
                break;
        }
    });

    // --- Dark/Light Mode ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleBtn.textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggleBtn.textContent = '🌙';
        }
    }
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        applyTheme(currentTheme);
    });
    const savedTheme = localStorage.getItem('theme') || 'light'; // Default to light
    applyTheme(savedTheme);


    // --- Resume Playback & State Management ---
    let saveStateTimeout;
    async function saveCurrentState(isNewDirectory = false) {
        if (playbackMode !== 'directory' && !isNewDirectory) return; // Only save for directory mode

        clearTimeout(saveStateTimeout);
        saveStateTimeout = setTimeout(async () => {
            const state = {
                directory: isNewDirectory ? currentDirectoryName : undefined, // Server will use app.config if undefined
                currentVideoIndex: currentVideoIndex,
                currentTime: videoPlayer.currentTime
            };
            // Filter out undefined to not overwrite existing directory in backend state if not changing it
            const payload = Object.fromEntries(Object.entries(state).filter(([_, v]) => v !== undefined));
            if (Object.keys(payload).length === 0) return;

            try {
                await fetch('/state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (error) {
                console.error("Error saving state:", error);
            }
        }, 1000); // Debounce: save 1 second after last change
    }
    
    async function applyState(state) {
        if (state.directoryName && state.videos && state.videos.length > 0) {
            playbackMode = 'directory';
            droppedFileObjects = [];
            videoFiles = state.videos;
            currentDirectoryName = state.directoryName;
            currentVideoIndex = parseInt(state.currentVideoIndex, 10) || 0;

            if (currentVideoIndex >= videoFiles.length) currentVideoIndex = 0; // Reset if out of bounds

            dropZone.style.display = 'none';
            videoArea.style.display = 'block';
            
            await loadVideo(currentVideoIndex); // Load the video first
            
            // Set currentTime after video is loaded enough for it to be seekable
            // The 'loadedmetadata' or 'canplay' event is better for this.
            // Let's set it and rely on the browser to handle if not ready.
             if (parseFloat(state.currentTime) > 0) {
                // Wait for 'loadedmetadata' to ensure duration is known and video is seekable
                const setTimeOnLoad = () => {
                    videoPlayer.currentTime = parseFloat(state.currentTime);
                    videoPlayer.removeEventListener('loadedmetadata', setTimeOnLoad);
                    videoPlayer.play(); // Autoplay if resuming
                };
                if (videoPlayer.readyState >= 1) { // HAVE_METADATA or more
                    videoPlayer.currentTime = parseFloat(state.currentTime);
                    videoPlayer.play();
                } else {
                    videoPlayer.addEventListener('loadedmetadata', setTimeOnLoad);
                }
            } else {
                videoPlayer.play(); // Autoplay if starting from beginning
            }

        } else {
            // No valid directory state, show selection
            dropZone.style.display = 'flex'; // Or 'block'
            videoArea.style.display = 'none';
        }
    }

    async function loadInitialState() {
        try {
            const response = await fetch('/state');
            if (response.ok) {
                const state = await response.json();
                applyState(state);
            } else {
                console.warn("Could not load initial state from server.");
                 dropZone.style.display = 'flex';
                 videoArea.style.display = 'none';
            }
        } catch (error) {
            console.error("Error loading initial state:", error);
            dropZone.style.display = 'flex';
            videoArea.style.display = 'none';
        }
    }

    // --- Drag and Drop ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Filter for video files and SRTs
            const playableFiles = Array.from(files).filter(file => 
                file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mkv') || file.name.toLowerCase().endsWith('.srt')
            );
            
            if (playableFiles.length > 0) {
                playbackMode = 'dropped';
                videoFiles = []; // Clear directory files
                // Separate videos and SRTs for easier handling
                droppedFileObjects = playableFiles;
                
                // Find the first actual video file to start playing
                const firstVideoFileIndex = droppedFileObjects.findIndex(f => !f.name.toLowerCase().endsWith('.srt'));

                if (firstVideoFileIndex !== -1) {
                    currentDirectoryName = "Dropped Files"; // Or derive from folder if one was dropped
                    dropZone.style.display = 'none';
                    videoArea.style.display = 'block';
                    loadVideo(firstVideoFileIndex);
                    videoPlayer.play();
                } else {
                    showErrorMessage("No video files found in dropped items. Only SRTs were dropped.");
                }
            } else {
                showErrorMessage("No video files dropped.");
            }
        }
    });
    // Also allow dropping onto the video player itself to add to a temporary playlist or replace
    videoArea.addEventListener('dragover', (e) => {
        e.preventDefault(); e.stopPropagation(); /* Similar to dropZone */
    });
    videoArea.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation(); /* Similar to dropZone */
        // For simplicity, this will behave like dropping on the dropZone
        // (i.e., replace current playlist with dropped files)
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const playableFiles = Array.from(files).filter(file => 
                file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mkv') || file.name.toLowerCase().endsWith('.srt')
            );
            if (playableFiles.length > 0) {
                playbackMode = 'dropped';
                videoFiles = [];
                droppedFileObjects = playableFiles;
                const firstVideoFileIndex = droppedFileObjects.findIndex(f => !f.name.toLowerCase().endsWith('.srt'));

                if (firstVideoFileIndex !== -1) {
                    currentDirectoryName = "Dropped Files";
                    loadVideo(firstVideoFileIndex);
                    videoPlayer.play();
                } else {
                     showErrorMessage("No video files found in dropped items. Only SRTs were dropped.");
                }
            }
        }
    });


    // --- Initialization ---
    updateVolumeUI(); // Set initial volume display
    loadInitialState(); // Load saved state on page load
});
