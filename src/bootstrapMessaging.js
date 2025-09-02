// src/bootstrapMessaging.js

"use client";

import { useState, useEffect } from "react";

// Import children components to render.
import MessagingWindow from "./components/messagingWindow";
import MessagingButton from "./components/messagingButton";
import WelcomeMenu from "./components/welcomeMenu"; // Import the WelcomeMenu component

import './bootstrapMessaging.css';

import { storeOrganizationId, storeDeploymentDeveloperName, storeSalesforceMessagingUrl } from './services/dataProvider';
import { determineStorageType, initializeWebStorage, getItemInWebStorageByKey, getItemInPayloadByKey } from './helpers/webstorageUtils';
import { APP_CONSTANTS, STORAGE_KEYS } from './helpers/constants';

import Draggable from "./ui-effects/draggable";

export default function BootstrapMessaging() {
    let [shouldShowMessagingButton, setShowMessagingButton] = useState(false);
    let [orgId, setOrgId] = useState('');
    let [deploymentDevName, setDeploymentDevName] = useState('');
    let [messagingURL, setMessagingURL] = useState('');
    let [shouldDisableMessagingButton, setShouldDisableMessagingButton] = useState(false);
    let [shouldShowMessagingWindow, setShouldShowMessagingWindow] = useState(false);
    let [showMessagingButtonSpinner, setShowMessagingButtonSpinner] = useState(false);
    let [isExistingConversation, setIsExistingConversation] = useState(false);

    // --- NEW STATE: Controls which view is visible inside the window ---
    const [currentView, setCurrentView] = useState('welcome');

    useEffect(() => {
        const storage = determineStorageType();
        if (!storage) {
            console.error(`Cannot initialize the app. Web storage is required for the app to function.`);
            return;
        }

        const messaging_webstorage_key = Object.keys(storage).filter(item => item.startsWith(APP_CONSTANTS.WEB_STORAGE_KEY))[0];

        if (messaging_webstorage_key) {
            const webStoragePayload = storage.getItem(messaging_webstorage_key);
            const orgId = getItemInPayloadByKey(webStoragePayload, STORAGE_KEYS.ORGANIZATION_ID);
            const deploymentDevName = getItemInPayloadByKey(webStoragePayload, STORAGE_KEYS.DEPLOYMENT_DEVELOPER_NAME);
            const messagingUrl = getItemInPayloadByKey(webStoragePayload, STORAGE_KEYS.MESSAGING_URL);

            if (!isValidOrganizationId(orgId)) {
                storage.removeItem(messaging_webstorage_key);
                setIsExistingConversation(false);
                return;
            }
            
            setOrgId(orgId);
            setDeploymentDevName(deploymentDevName);
            setMessagingURL(messagingUrl);
            initializeMessagingClient(orgId, deploymentDevName, messagingUrl);

            const messagingJwt = getItemInWebStorageByKey(STORAGE_KEYS.JWT);
            if (messagingJwt) {
                setIsExistingConversation(true);
                setShowMessagingButton(true);
                setShouldDisableMessagingButton(true);
                setShouldShowMessagingWindow(true);
                // If we have an existing conversation, we go straight to chat
                setCurrentView('chat'); 
            } else {
                setIsExistingConversation(false);
            }
        } else {
            setIsExistingConversation(false);
        }

        return () => {
            showMessagingWindow(false);
        };
    }, []);

    function initializeMessagingClient(ord_id, deployment_dev_name, messaging_url) {
        initializeWebStorage(ord_id || orgId);
        storeOrganizationId(ord_id || orgId);
        storeDeploymentDeveloperName(deployment_dev_name || deploymentDevName);
        storeSalesforceMessagingUrl(messaging_url || messagingURL);
    }
    
    // --- Helper functions (isValidOrganizationId, etc.) remain the same ---
    function isValidOrganizationId(id) { return typeof id === "string" && (id.length === 18 || id.length === 15) && id.substring(0, 3) === APP_CONSTANTS.ORGANIZATION_ID_PREFIX; }
    function isValidDeploymentDeveloperName(name) { return typeof name === "string" && name.length > 0; }
    function isSalesforceUrl(url) { try { return typeof url === "string" && url.length > 0 && url.slice(-19) === APP_CONSTANTS.SALESFORCE_MESSAGING_SCRT_URL; } catch (err) { return false; } }
    function isValidUrl(url) { try { const urlToValidate = new URL(url); return isSalesforceUrl(url) && urlToValidate.protocol === APP_CONSTANTS.HTTPS_PROTOCOL; } catch (err) { return false; } }

    function handleDeploymentDetailsFormSubmit(evt) {
        if (evt) {
            if(!isValidOrganizationId(orgId) || !isValidDeploymentDeveloperName(deploymentDevName) || !isValidUrl(messagingURL)) {
                alert(`Invalid deployment details.`);
                setShowMessagingButton(false);
                return;
            }
            initializeMessagingClient();
            setIsExistingConversation(false);
            setShowMessagingButton(true);
        }
    }

    function shouldDisableFormSubmitButton() { return (orgId && orgId.length === 0) || (deploymentDevName && deploymentDevName.length === 0) || (messagingURL && messagingURL.length === 0); }

    function handleMessagingButtonClick(evt) {
        if (evt) {
            setShowMessagingButtonSpinner(true);
            showMessagingWindow(true);
        }
    }

    function showMessagingWindow(shouldShow) {
        setShouldShowMessagingWindow(Boolean(shouldShow));
        if (!shouldShow) {
            setShouldDisableMessagingButton(false);
            setShowMessagingButtonSpinner(false);
            setShowMessagingButton(false);
            // --- MODIFICATION: Reset view to welcome when window is closed ---
            setCurrentView('welcome');
        }
    }

    function appUiReady(isReady) {
        setShouldDisableMessagingButton(isReady);
        setShowMessagingButtonSpinner(!isReady);
    }

    // --- NEW FUNCTION: This transitions from welcome to the chat view ---
    const handleStartChat = () => {
        // We set the view to 'chat' which will trigger the conditional render below
        setCurrentView('chat');
    };

    return (
        <>
            <h1>Messaging for Web - Sample App</h1>
            <div className="deploymentDetailsForm">
                <h4>Input your Embedded Service (Custom Client) deployment details below</h4>
                <label>Organization ID</label>
                <input type="text" value={orgId || ""} onChange={e => setOrgId(e.target.value.trim())} disabled={shouldShowMessagingButton}></input>
                <label>Developer Name</label>
                <input type="text" value={deploymentDevName || ""} onChange={e => setDeploymentDevName(e.target.value.trim())} disabled={shouldShowMessagingButton}></input>
                <label>URL</label>
                <input type="text" value={messagingURL || ""} onChange={e => setMessagingURL(e.target.value.trim())} disabled={shouldShowMessagingButton}></input>
                <button className="deploymentDetailsFormSubmitButton" onClick={handleDeploymentDetailsFormSubmit} disabled={shouldDisableFormSubmitButton()}>
                    Submit
                </button>
            </div>
            {shouldShowMessagingButton &&
                <MessagingButton
                    clickHandler={handleMessagingButtonClick}
                    disableButton={shouldDisableMessagingButton}
                    showSpinner={showMessagingButtonSpinner} />}
            {shouldShowMessagingWindow &&
                <Draggable intitialPosition={{ x: 1000, y: 500 }}>
                    {/* --- THIS IS THE KEY LOGIC CHANGE --- */}
                    {currentView === 'welcome' ? (
                        // If view is 'welcome', show the WelcomeMenu and pass it the function to start the chat
                        <WelcomeMenu onStartConversation={handleStartChat} />
                    ) : (
                        // Otherwise, show the main MessagingWindow
                        <MessagingWindow
                            isExistingConversation={isExistingConversation}
                            showMessagingWindow={showMessagingWindow}
                            deactivateMessagingButton={appUiReady} />
                    )}
                </Draggable>
            }
        </>
    );
}