import "./transferMessage.css";
import { util } from "../helpers/common";

export default function TransferMessage({conversationEntry}) {
    
    function getTransferMessage() {
        if (conversationEntry.messageType === "Transfer") {
            return "Transferring you to an agent...";
        }
        return "Processing your request...";
    }

    return (
        <div className="transferMessageContainer">
            <div className="transferMessageBubble">
                <div className="transfer-spinner"></div>
                <p className="transferMessageText">{getTransferMessage()}</p>
            </div>
            <p className="transferMessageTime">
                {util.getFormattedTime(conversationEntry.transcriptedTimestamp)}
            </p>
        </div>
    );
}