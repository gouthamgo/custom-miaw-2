import "./conversationEntry.css";
import * as ConversationEntryUtil from "../helpers/conversationEntryUtil";

// Import children components to plug in and render.
import TextMessage from "./textMessage";
import ParticipantChange from "./participantChange";
import ChoicesMessage from "./choicesMessage";
import TransferMessage from "./transferMessage";



export default function ConversationEntry({conversationEntry,onChoiceSelect}) {

return (
    <>
        <div className="conversationEntryContainer">
            {/* Add debug logging */}
            {console.log("ConversationEntry - messageType:", conversationEntry.messageType)}
            {console.log("ConversationEntry - entryType:", conversationEntry.entryType)}
            {console.log("ConversationEntry - full entry:", conversationEntry)}
            
            {/* Render component for a conversation entry of type Text Message. */}
            {ConversationEntryUtil.isTextMessage(conversationEntry) && <TextMessage conversationEntry={conversationEntry} />}
            
            {/* Add debug for choices */}
            {console.log("Is ChoicesMessage?", ConversationEntryUtil.isChoicesMessage(conversationEntry))}
            
            {/* Render component for a conversation entry of type Choices Message. */}
                {ConversationEntryUtil.isChoicesMessage(conversationEntry) && 
                  <ChoicesMessage 
                    conversationEntry={conversationEntry} 
                    onChoiceSelect={onChoiceSelect} />}
            {/* Render component for transfer events */}
                            {ConversationEntryUtil.isTransferEvent(conversationEntry) && <TransferMessage conversationEntry={conversationEntry} />}
                
                {/* Render component for a conversation entry of type Participant Change. */}
                {ConversationEntryUtil.isParticipantChangeEvent(conversationEntry) && <ParticipantChange conversationEntry={conversationEntry} />}
        </div>
    </>
);
}

