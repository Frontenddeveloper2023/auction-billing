import React, { useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Mic, MicOff, X } from "lucide-react";
import "./VoiceSearch.css";

const VoiceSearch = ({ onSearch, language = "en-IN", minimal = false }) => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const onSearchRef = React.useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (transcript && !listening) {
      onSearchRef.current(transcript);
    }
  }, [transcript, listening]);

  if (!browserSupportsSpeechRecognition) {
    return null;
  }

  const handleReset = () => {
    resetTranscript();
    onSearch("");
  };

  const startListening = () => {
    resetTranscript();
    SpeechRecognition.startListening({ 
      continuous: false, 
      language: language 
    });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  return (
    <div className={`voice-search-container ${minimal ? "minimal" : ""}`}>
      <button
        type="button"
        className={`voice-btn ${listening ? "listening" : ""} ${minimal ? "minimal" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          listening ? stopListening() : startListening();
        }}
        title={listening ? "Stop Listening" : "Start Voice Search"}
      >
        {listening ? (
          <div className="mic-pulse">
            <Mic size={minimal ? 18 : 20} />
          </div>
        ) : (
          <Mic size={minimal ? 18 : 20} />
        )}
      </button>
      
      {listening && (
        <div className="voice-indicator">
          <div className="wave"></div>
          <div className="wave"></div>
          <div className="wave"></div>
          <span className="listening-text">Listening...</span>
        </div>
      )}

      {transcript && !listening && (
        <button 
          type="button" 
          className="reset-voice-btn"
          onClick={handleReset}
          title="Clear Search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default VoiceSearch;
