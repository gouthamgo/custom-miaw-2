// src/components/messagingWindow.js

import { useState } from "react";
import "./messagingWindow.css";
import Conversation from "../components/conversation";

// Accept both 'country' and 'email' as props
export default function MessagingWindow({ country, email, ...otherProps }) {
    let [uiReady, setUIReady] = useState(false);

    function setAppUIReady(isUIReady) {
        setUIReady(isUIReady);
        otherProps.deactivateMessagingButton(isUIReady);
    }

    function generateMessagingWindowClassName() {
        const className = "messagingWindow";
        return className + `${uiReady ? "" : " hide"}`;
    }

    return(
        <div className={generateMessagingWindowClassName()}>
            {/* Pass ALL props down, including country and email */}
            <Conversation
                {...otherProps}
                uiReady={setAppUIReady}
                country={country}
                email={email}
            />
        </div>
    );
}