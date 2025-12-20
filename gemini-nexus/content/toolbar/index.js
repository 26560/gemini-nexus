
// content/toolbar/index.js

(function() {
    // Bootstrap the Floating Toolbar Controller
    // The Controller now manages SelectionObserver, UI, Actions, etc.
    window.GeminiFloatingToolbar = window.GeminiToolbarController; 
    // ^ Mapping to keep backward compatibility with content/index.js usage
})();
