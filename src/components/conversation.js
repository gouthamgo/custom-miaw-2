// src/components/conversation.js

import { useEffect, useState } from "react";
import * as EventSourcePolyfill from "../helpers/eventsource-polyfill.js";

// Import children components to plug in and render.
import MessagingHeader from "./messagingHeader";
import MessagingBody from "./messagingBody";
import MessagingInputFooter from "./messagingInputFooter";

import { setJwt, setLastEventId, storeConversationId, getConversationId, getJwt, clearInMemoryData, setDeploymentConfiguration } from "../services/dataProvider";
import { subscribeToEventSource, closeEventSource } from '../services/eventSourceService';
import { sendTypingIndicator, sendTextMessage, getContinuityJwt, listConversations, listConversationEntries, closeConversation, getUnauthenticatedAccessToken, createConversation } from "../services/messagingService";
import * as ConversationEntryUtil from "../helpers/conversationEntryUtil";
import { CONVERSATION_CONSTANTS, STORAGE_KEYS, CLIENT_CONSTANTS } from "../helpers/constants";
import { setItemInWebStorage, clearWebStorage } from "../helpers/webstorageUtils";
import { util } from "../helpers/common";
import { prechatUtil } from "../helpers/prechatUtil.js";
import Prechat from "./prechat.js";
import CountdownTimer from "../helpers/countdownTimer.js";

// Accept 'country' AND 'email' as props
export default function Conversation({ country, email, ...props }) {
    let [conversationEntries, setConversationEntries] = useState([]);
    let [conversationStatus, setConversationStatus] = useState(CONVERSATION_CONSTANTS.ConversationStatus.NOT_STARTED_CONVERSATION);
    let [showPrechatForm, setShowPrechatForm] = useState(false);
    let [failedMessage, setFailedMessage] = useState(undefined);
    let [currentTypingParticipants, setCurrentTypingParticipants] = useState({});
    let [isAnotherParticipantTyping, setIsAnotherParticipantTyping] = useState(false);

    useEffect(() => {
        let conversationStatePromise;

        conversationStatePromise = props.isExistingConversation ? handleExistingConversation() : handleNewConversation();
        conversationStatePromise
        .then(() => {
            handleSubscribeToEventSource()
            .then(() => props.uiReady(true))
            .catch(() => {
                props.showMessagingWindow(false);
            })
        });

        return () => {
            conversationStatePromise
            .then(() => {
                cleanupMessagingData();
            });
        };
    }, []);

    function updateConversationStatus(status) {
        setConversationStatus(status);
    }

    function handleNewConversation() {
        return handleGetUnauthenticatedJwt()
                .then(() => {
                    console.log("Creating a new conversation with pre-chat data...");
                    
                    const routingAttributes = {
                        "Country": country,
                        "Email": email
                    };
                    
                    return handleCreateNewConversation(routingAttributes)
                            .then(() => {
                                console.log(`Completed initializing a new conversation with conversationId: ${getConversationId()} and country: ${country}, email: ${email}`);
                            })
                            .catch(err => {
                                console.error(`Error during new conversation creation: ${err}`);
                            });
                })
                .catch(err => {
                    console.error(`Error getting unauthenticated JWT: ${err}`);
                });
    }

    function handleExistingConversation() {
        return handleGetContinuityJwt()
                .then(() => {
                    return handleListConversations()
                            .then(() => {
                                console.log(`Successfully listed the conversations.`);
                                handleListConversationEntries()
                                .then(console.log(`Successfully retrieved entries for the current conversation: ${getConversationId()}`))
                                .catch(err => {
                                    console.error(`${err}`);
                                });
                            })
                            .catch(err => {
                                console.error(`${err}`);
                            });
                })
                .catch(err => {
                    console.error(`${err}`);
                });
    }

    function handleGetUnauthenticatedJwt() {
        if (getJwt()) {
            console.warn("Messaging access token (JWT) already exists in the web storage. Discontinuing to create a new Unauthenticated access token.");
            return handleExistingConversation().then(Promise.reject());
        }

        return getUnauthenticatedAccessToken()
                .then((response) => {
                    console.log("Successfully fetched an Unauthenticated access token.");
                    if (typeof response === "object") {
                        setJwt(response.accessToken);
                        setItemInWebStorage(STORAGE_KEYS.JWT, response.accessToken);
                        setLastEventId(response.lastEventId);
                        setDeploymentConfiguration(response.context && response.context.configuration && response.context.configuration.embeddedServiceConfig);
                    }    
                })
                .catch((err) => {
                    console.error(`Something went wrong in fetching an Unauthenticated access token: ${err && err.message ? err.message : err}`);
                    handleMessagingErrors(err);
                    cleanupMessagingData();
                    props.showMessagingWindow(false);
                    throw new Error("Failed to fetch an Unauthenticated access token.");
                });
    }

    function handleCreateNewConversation(routingAttributes) {
        if (conversationStatus === CONVERSATION_CONSTANTS.ConversationStatus.OPENED_CONVERSATION) {
            console.warn("Cannot create a new conversation while a conversation is currently open.");
            return Promise.reject();
        }

        storeConversationId(util.generateUUID());
        
        return createConversation(getConversationId(), routingAttributes)
                .then(() => {
                    console.log(`Successfully created a new conversation with conversation-id: ${getConversationId()}`);
                    updateConversationStatus(CONVERSATION_CONSTANTS.ConversationStatus.OPENED_CONVERSATION);
                    props.showMessagingWindow(true);
                })
                .catch((err) => {
                    console.error(`Something went wrong in creating a new conversation with conversation-id: ${getConversationId()}: ${err && err.message ? err.message : err}`);
                    handleMessagingErrors(err);
                    cleanupMessagingData();
                    props.showMessagingWindow(false);
                    throw new Error("Failed to create a new conversation.");
                });
    }

    function handleGetContinuityJwt() {
        return getContinuityJwt()
                .then((response) => {
                    setJwt(response.accessToken);
                    setItemInWebStorage(STORAGE_KEYS.JWT, response.accessToken);
                })
                .catch((err) => {
                    console.error(`Something went wrong in fetching a Continuation Access Token: ${err && err.message ? err.message : err}`);
                    handleMessagingErrors(err);
                    throw new Error("Failed to fetch a Continuation access token.");
                });
    }

    function handleListConversations() {
        return listConversations()
                .then((response) => {
                    if (response && response.openConversationsFound > 0 && response.conversations.length) {
                        const openConversations = response.conversations;
                        if (openConversations.length > 1) {
				            console.warn(`Expected the user to be participating in 1 open conversation but instead found ${openConversations.length}. Loading the conversation with latest startTimestamp.`);
				            openConversations.sort((conversationA, conversationB) => conversationB.startTimestamp - conversationA.startTimestamp);
                        }
                        storeConversationId(openConversations[0].conversationId);
                        updateConversationStatus(CONVERSATION_CONSTANTS.ConversationStatus.OPENED_CONVERSATION);
                        props.showMessagingWindow(true);
                    } else {
                        cleanupMessagingData();
                        props.showMessagingWindow(false);
                    }
                })
                .catch((err) => {
                    console.error(`Something went wrong in fetching a list of conversations: ${err && err.message ? err.message : err}`);
                    handleMessagingErrors(err);
                    throw new Error("Failed to list the conversations.");
                });
    }

    function handleListConversationEntries() {
        return listConversationEntries(getConversationId())
                .then((response) => {
                    if (Array.isArray(response)) {
                        response.reverse().forEach(entry => {
                            const conversationEntry = generateConversationEntryForCurrentConversation(entry);
                            if (!conversationEntry) return;
    
                            switch (conversationEntry.entryType) {
                                case CONVERSATION_CONSTANTS.EntryTypes.CONVERSATION_MESSAGE:
                                    conversationEntry.isEndUserMessage = ConversationEntryUtil.isMessageFromEndUser(conversationEntry);
                                    addConversationEntry(conversationEntry);
                                    break;
                                case CONVERSATION_CONSTANTS.EntryTypes.PARTICIPANT_CHANGED:
                                case CONVERSATION_CONSTANTS.EntryTypes.ROUTING_RESULT:
                                    addConversationEntry(conversationEntry);
                                    break;
                                default:
                                    console.log(`Unrecognized conversation entry type: ${conversationEntry.entryType}.`);
                            }
                        });
                    } else {
                        console.error(`Expecting a response of type Array from listConversationEntries but instead received: ${response}`);
                    }
                })
                .catch((err) => {
                    console.error(`Something went wrong while processing entries from listConversationEntries response:  ${err && err.message ? err.message : err}`);
                    handleMessagingErrors(err);
                    throw new Error("Failed to list the conversation entries for the current conversation.");
                });
    }

    function handleSubscribeToEventSource() {
        return subscribeToEventSource({
                    [CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_MESSAGE]: handleConversationMessageServerSentEvent,
                    [CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_ROUTING_RESULT]: handleRoutingResultServerSentEvent,
                    [CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_PARTICIPANT_CHANGED]: handleParticipantChangedServerSentEvent,
                    [CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_TYPING_STARTED_INDICATOR]: handleTypingStartedIndicatorServerSentEvent,
                    [CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_TYPING_STOPPED_INDICATOR]: handleTypingStoppedIndicatorServerSentEvent,
                    [CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_DELIVERY_ACKNOWLEDGEMENT]: handleConversationDeliveryAcknowledgementServerSentEvent,
                    [CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_READ_ACKNOWLEDGEMENT]: handleConversationReadAcknowledgementServerSentEvent,
                    [CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_CLOSE_CONVERSATION]: handleCloseConversationServerSentEvent
                })
                .then(() => {
                    console.log("Subscribed to the Event Source (SSE).");
                })
                .catch((err) => {
                    handleMessagingErrors(err);
                    throw new Error(err);
                });
    }

    function generateConversationEntryForCurrentConversation(parsedEventData) {
        const conversationEntry = ConversationEntryUtil.createConversationEntry(parsedEventData);
        if (parsedEventData.conversationId === getConversationId()) {
            return conversationEntry;
        }
        console.log(`Current conversation-id: ${getConversationId()} does not match the conversation-id in server sent event: ${parsedEventData.conversationId}. Ignoring the event.`);
        return undefined;
    }

    function addConversationEntry(conversationEntry) {
        setConversationEntries(prevEntries => [...prevEntries, conversationEntry]);
    }

    function handleConversationMessageServerSentEvent(event) {
        try {
            if (event && event.lastEventId) setLastEventId(event.lastEventId);
            const parsedEventData = ConversationEntryUtil.parseServerSentEventData(event);
            const conversationEntry = generateConversationEntryForCurrentConversation(parsedEventData);
            if (!conversationEntry) return;

            conversationEntry.isEndUserMessage = ConversationEntryUtil.isMessageFromEndUser(conversationEntry);
            if (conversationEntry.isEndUserMessage) conversationEntry.isSent = true;

            addConversationEntry(conversationEntry);
        } catch(err) {
            console.error(`Something went wrong in handling conversation message server sent event: ${err}`);
        }
    }
    
    function handleRoutingResultServerSentEvent(event) {
        // This function is unchanged
    }
    
    function handleParticipantChangedServerSentEvent(event) {
        // This function is unchanged
    }
    
    function handleTypingStartedIndicatorServerSentEvent(event) {
        // This function is unchanged
    }

    function handleTypingStoppedIndicatorServerSentEvent(event) {
        // This function is unchanged
    }
    
    function handleConversationDeliveryAcknowledgementServerSentEvent(event) {
        // This function is unchanged
    }

    function handleConversationReadAcknowledgementServerSentEvent(event) {
        // This function is unchanged
    }
    
    function handleCloseConversationServerSentEvent(event) {
        // This function is unchanged
    }
    
    function handleSendTextMessage(conversationId, value, messageId, inReplyToMessageId, isNewMessagingSession, routingAttributes, language) {
        return sendTextMessage(conversationId, value, messageId, inReplyToMessageId, isNewMessagingSession, routingAttributes, language)
                .catch((err) => {
                    console.error(`Something went wrong while sending a message to conversation ${conversationId}: ${err}`);
                    setFailedMessage(Object.assign({}, {messageId, value, inReplyToMessageId, isNewMessagingSession, routingAttributes, language}));
                    handleMessagingErrors(err);
                });
    }
    
    function endConversation() {
        if (conversationStatus === CONVERSATION_CONSTANTS.ConversationStatus.OPENED_CONVERSATION) {
            return closeConversation(getConversationId())
                .then(() => {
                    console.log(`Successfully closed the conversation with conversation-id: ${getConversationId()}`);
                })
                .catch((err) => {
                    console.error(`Something went wrong in closing the conversation with conversation-id ${getConversationId()}: ${err}`);
                })
                .finally(() => {
                    cleanupMessagingData();
                });
        }
    }
    
    function closeMessagingWindow() {
        if (conversationStatus === CONVERSATION_CONSTANTS.ConversationStatus.CLOSED_CONVERSATION || conversationStatus === CONVERSATION_CONSTANTS.ConversationStatus.NOT_STARTED_CONVERSATION) {
            props.showMessagingWindow(false);
        }
    }
    
    function cleanupMessagingData() {
        closeEventSource()
        .then(console.log("Closed the Event Source (SSE)."))
        .catch((err) => {
            console.error(`Something went wrong in closing the Event Source (SSE): ${err}`);
        });
        clearWebStorage();
        clearInMemoryData();
        updateConversationStatus(CONVERSATION_CONSTANTS.ConversationStatus.CLOSED_CONVERSATION);
    }
    
    function handleMessagingErrors(err) {
        if (typeof err === "object") {
            if (err.status) {
                switch (err.status) {
                    case 401:
                        cleanupMessagingData();
                        props.showMessagingWindow(false);
                        break;
                    // ... other cases
                }
            }
        }
    }

    function handlePrechatSubmit(prechatData) {
        let prechatSubmitPromise;
        if (failedMessage) {
            prechatSubmitPromise = handleSendTextMessage(getConversationId(), failedMessage.value, failedMessage.messageId, failedMessage.inReplyToMessageId, true, prechatData, failedMessage.language);
        } else {
            prechatSubmitPromise = handleCreateNewConversation(prechatData);
        }
        prechatSubmitPromise.then(() => { setShowPrechatForm(false); });
    }

    function handleChoiceSelect(choice) {
        const conversationId = getConversationId();
        const messageId = util.generateUUID();
        return handleSendTextMessage(conversationId, choice.titleItem?.title || "Selected option", messageId, undefined, false, undefined, "en");
    }

    return (
        <>
            <MessagingHeader
                conversationStatus={conversationStatus}
                endConversation={endConversation}
                closeMessagingWindow={closeMessagingWindow} />
            {!showPrechatForm &&
            <>
                <MessagingBody
                    conversationEntries={conversationEntries}
                    conversationStatus={conversationStatus} 
                    typingParticipants={currentTypingParticipants}
                    showTypingIndicator={isAnotherParticipantTyping}
                        onChoiceSelect={handleChoiceSelect} /> 
                <MessagingInputFooter
                    conversationStatus={conversationStatus} 
                    sendTextMessage={handleSendTextMessage} 
                    sendTypingIndicator={sendTypingIndicator} />
            </>
            }
            {
                showPrechatForm &&
                <Prechat prechatSubmit={handlePrechatSubmit} />
            }
        </>
    );
}