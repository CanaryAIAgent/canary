# Multimodal: Social Media Agent

## Story

A customer subscribes to a social media agent — a bot or dummy Twitter account. The bot can take in @tweets (similar to @grok) where users send images. Those images get forwarded to our agent service.

The agent analyzes the image, classifies what type of image it is, and determines whether it represents a disaster or emergency event.

Separately, the agent service maintains a registry of connected Telegram users. Based on their notification settings, they get alerted when something bad is happening. The agent then informs these users of the event.

## Core Systems

- **Classification System** — Determines the type and severity of an incoming image/event.
- **Validation System** — Handles multiple corroborating events, applies thresholds before escalating (e.g., multiple reports of the same incident).

## Project Description

Imagine getting alerted about every incident in your neighborhood, with an agent that keeps you aware of what's going on.

**Welcome to Canary** — an agentic system that can summon authorities and resources.

Canary is an **Emergency Operation Center** responsible for:

- Disaster recovery
- Relief coordination
- Incident tracking

It enables input from users across the world via social media and our own app.

The system uses agents for classification and then pushes behaviors, including:

- Push notifications to subscribed users
- User ability to launch swarms of agents
- Incident reporting via chat bots

## Technologies

| Technology | Purpose |
|---|---|
| **Google APIs** | Multimodal analysis of tweets (image classification) |
| **Vercel** | Hosting, Vercel AI SDK |
| **Supabase** | Persistent layer (database, auth) |
| **ElevenLabs** | Chatbot system (voice/conversational interface) |
