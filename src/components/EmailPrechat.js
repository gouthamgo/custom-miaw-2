// src/components/EmailPrechat.js

import React, { useState } from 'react';
import './EmailPrechat.css';
import { FaArrowLeft } from 'react-icons/fa'; // Import a back arrow icon

// --- MODIFICATION 1: Accept a new 'onGoBack' prop ---
export default function EmailPrechat({ onPrechatSubmit, onGoBack }) {
    const [email, setEmail] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        if (email) {
            onPrechatSubmit(email);
        }
    };

    // --- MODIFICATION 2: This function stops the drag event from interfering with our form ---
    const handleMouseDown = (e) => {
        e.stopPropagation();
    };

    return (
        <div className="prechatContainer">
            {/* --- MODIFICATION 3: Add the back button and link it to the onGoBack prop --- */}
            <button onClick={onGoBack} className="backButton">
                <FaArrowLeft /> Go Back
            </button>

            <div className="prechatHeader">
                <h2>Just one more step</h2>
                <h1>Enter your email to start</h1>
            </div>
            
            {/* --- MODIFICATION 4: Add the onMouseDown handler to the form --- */}
            <form className="prechatForm" onSubmit={handleSubmit} onMouseDown={handleMouseDown}>
                <label htmlFor="email-input">Email Address</label>
                <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                />
                <button type="submit" className="prechatSubmitButton">
                    Start Chat
                </button>
            </form>
        </div>
    );
}
