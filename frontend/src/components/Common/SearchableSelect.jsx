import React, { useState, useRef, useEffect } from 'react';
import './SearchableSelect.css';
import VoiceSearch from './VoiceSearch';

const SearchableSelect = ({ options, value, onChange, placeholder, disabled, name, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (option) => {
    onChange({ target: { name, value: option.value } });
    setSearchTerm('');
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="searchable-select-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Hidden input for native form validation */}
      <input
        type="text"
        name={name}
        value={value || ''}
        onChange={() => {}}
        required={required}
        style={{
          opacity: 0,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none'
        }}
        tabIndex={-1}
      />
      
      <div 
        className={`saas-select searchable-select-trigger ${disabled ? 'disabled' : ''}`} 
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? '' : 'searchable-select-placeholder'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="searchable-select-chevron">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      
      {isOpen && (
        <div className="searchable-select-dropdown">
          <div className="searchable-select-search-wrap" style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="saas-input searchable-select-search-input" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ paddingRight: '35px' }}
              autoFocus
            />
            <div style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
              <VoiceSearch onSearch={(text) => setSearchTerm(text)} minimal={true} />
            </div>
          </div>
          <div className="searchable-select-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div 
                  key={option.value} 
                  className="searchable-select-option"
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="searchable-select-empty">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
