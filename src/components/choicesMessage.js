import { useState } from "react";
import "./choicesMessage.css";
import * as ConversationEntryUtil from "../helpers/conversationEntryUtil";
import { util } from "../helpers/common";

export default function ChoicesMessage({ conversationEntry,onChoiceSelect }) {
    const [selectedChoice, setSelectedChoice] = useState(null);

    // DEBUG: Log what we received
    console.log("ChoicesMessage component received:", conversationEntry);
    
   
    
    // ... rest of component

    /**
     * Get the choices/options from the bot message
     */
    function getChoices() {
        return ConversationEntryUtil.getChoicesFromMessage(conversationEntry);
    }

    /**
     * Get the main text content from the choices message
     */
    function getMessageText() {
        return ConversationEntryUtil.getChoicesMessageText(conversationEntry);
    }

    /**
     * Handle when user clicks a choice button
     */
    function handleChoiceClick(choice) {
        setSelectedChoice(choice);

        if(onChoiceSelect){
            onChoiceSelect(choice)
            .then(() =>{
                console.log("Successfully sent choice to bot",choice.titleItem?.title);

            })
            .catch((error) =>{
                console.error("Failed to send choice:", error)
            });
        }
        // Here you would typically send the choice back as a message
        // For now, just log it
        console.log("User selected choice:", choice);
    }

    const choices = getChoices();
    const messageText = getMessageText();

        
    console.log("Extracted choices:", choices);
    console.log("Extracted message text:", messageText);

    return (
        <div className="choicesMessageContainer">
            {/* Main message text */}
            {messageText && (
                <div className="choicesMessageBubble incoming">
                    <p className="choicesMessageText">{messageText}</p>
                </div>
            )}
            
            {/* Choice buttons */}
            <div className="choicesButtonContainer">
                {choices.map((choice, index) => (
                    <button
                        key={index}
                        className={`choiceButton ${selectedChoice === choice ? 'selected' : ''}`}
                        onClick={() => handleChoiceClick(choice)}
                        disabled={selectedChoice !== null}
                    >
                        {choice.titleItem?.title || choice.title || 'Option'}
                    </button>
                ))}
            </div>
            
            {/* Message metadata */}
            <p className="choicesMessageSender">
                {conversationEntry.actorName} at {util.getFormattedTime(conversationEntry.transcriptedTimestamp)}
            </p>
        </div>
    );
}