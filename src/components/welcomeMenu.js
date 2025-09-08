// src/components/welcomeMenu.js
import React, { useState } from 'react';
import './welcomeMenu.css';
import { VscSend } from "react-icons/vsc";
import { FaArrowRight, FaArchive, FaArrowLeft } from "react-icons/fa";

// A simple map of questions to answers.
const faqContent = {
  'fit': {
    question: "How do I find the perfect fit?",
    answer: "We recommend checking the size guide on each product page. You can also contact us with your measurements for a personalized recommendation!"
  },
  'discount': {
    question: "Where can I get a discount?",
    answer: "The best way to get discounts is by signing up for our newsletter! We send out exclusive offers and promotions regularly."
  },
  'return': {
    question: "How do I arrange a return?",
    answer: "You can do return however you want Lets not return anything."
  },
  'Chirstmas': {
    question: "What to buy for Christmas?",
    answer: "Christmas Gifts"
  }
};

export default function WelcomeMenu({ onStartConversation }) {
  // --- NEW STATE: Tracks which question is active, or null for the main menu ---
  const [activeQuestion, setActiveQuestion] = useState(null);

  const handleStartChat = () => {
    onStartConversation();
  };

  const handleQuestionClick = (questionKey) => {
    setActiveQuestion(questionKey);
  };

  const handleGoBack = () => {
    setActiveQuestion(null);
  };

  // If a question is active, render the Answer View
  if (activeQuestion) {
    const content = faqContent[activeQuestion];
    return (
      <div className="welcomeMenuContainer">
        <div className="answerView">
          <button onClick={handleGoBack} className="backButton">
            <FaArrowLeft /> Back
          </button>
          <h3>{content.question}</h3>
          <p>{content.answer}</p>
          <div className="answerActions">
            <p>Was this helpful?</p>
            <button className="actionButton" onClick={handleGoBack}>Yes, this helped!</button>
            <button className="actionButton" onClick={handleStartChat}>Chat with an expert</button>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render the Main Menu View
  return (
    <div className="welcomeMenuContainer">
      <div className="welcomeHeader">
        <h2>Taking Shape</h2>
        <h1>Live chat with our team </h1>
      </div>
      
      <div className="welcomeOptions">
        {/* Quick Questions Card */}
        <div className="card questionsCard">
          <button className="optionButton" onClick={() => handleQuestionClick('fit')}>
            <span>How do I find the perfect fit?</span>
            <span className="arrow">{'>'}</span>
          </button>
          <button className="optionButton" onClick={() => handleQuestionClick('discount')}>
            <span>Where can I get a discount?</span>
            <span className="arrow">{'>'}</span>
          </button>
          <button className="optionButton" onClick={() => handleQuestionClick('return')}>
            <span>How do I arrange a return?</span>
            <span className="arrow">{'>'}</span>
          </button>
          <button className="optionButton" onClick={() => handleQuestionClick('Chirstmas')}>
            <span>What to buy for Christmas?</span>
            <span className="arrow">{'>'}</span>
          </button>
        </div>

        {/* Track Orders Card */}
        <div className="card trackCard" onClick={handleStartChat}>
          <FaArchive size={20} className="optionIcon" />
          <span className="optionText">Track and manage my orders</span>
          <span className="arrow">{'>'}</span>
        </div>
        
        {/* Start Chat Card */}
        <div className="card chatCard" onClick={handleStartChat}>
          <div className="chatInfo">
            <div className="chatIcon">TS</div>
            <div className="chatText">
              <strong>Taking Shape</strong>
              <span>Chat with the team</span>
            </div>
          </div>
          <VscSend className="sendIcon" />
        </div>
      </div>

      {/* Previous Conversation Link */}
      <div className="previousConversationLink">
          Go to previous conversation <FaArrowRight size={12} />
      </div>
    </div>
  );
}