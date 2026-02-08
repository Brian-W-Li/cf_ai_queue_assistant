# cf_ai_queue_assistant
A chat UI where users can enqueue jobs, query status, and get LLM explanations. A durable object stores per session memory.

## Overview

This application is a minimal job queue system with a chat based interface

Users can
- enqueue jobs
- list queued jobs and completed jobs
- process jobs one at a time

Users may explicitly issue commands with 'enqueue x', 'list' and 'work' or may ask the app in plain English 
e.g "can you add 'hello' to the queue"

The focus of this project is on demonstrating 'system design' instead of focusing on improving UI.

## Architecture

Cloudflare Worker
- Entry point for all HTTP requests
- Serves the frontend
- Routes requests to Durable Object
- Use LLM to interpret user input into known commands

Durable Object
- Represents a single logical job queue
- Only works on one thing at a time, ensuring race conditions are not a problem
- Persists data across requests and restarts

Workers AI
- Uses Llama 3.1 from Cloudflare docs via Workers AI
- Converts natural language into understandable queue commands

Frontend
- Simple HTML + Javascript
- Sends messages to api/chat
- Displays error messages

## Commands
- enqueue <text>
- list
- work

"Add this job to the queue"
"What jobs are in the list"
"process a job"

## Design Background 

This project is a natural evolution of a distributed job queue I previously built in Go.
In the Go version, the system consisted of 
- a HTTP server handling enqueue and status
- a queue that was protected by mutexes and unique job ids
- worker goroutines that asynchronously processed jobs

The Cloudflare version takes the same core ideas
- The Cloudflare worker replaces the Go HTTP server
- A durable object replaces the queue and the mutexes
- The durable object storage replicates the in-memory queue in the server
- The LLM addition adds flexibility to the Go version it didn't have

Furthermore, the adaptation of the project to Cloudflare allows the project to scale due to its edge-native model.

## Running Locally
Prerequisites
- Node.js
- Cloudflare account
- Wrangler

To run the code:
- ```bash
- git clone <repoURL>
- cd cf_ai_queue_assistant
- npm install
- wrangler dev --remote
- Open http://localhost:8787

