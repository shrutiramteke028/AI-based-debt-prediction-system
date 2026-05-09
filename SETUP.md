\# HospitalDebt-AI — Setup Guide



\## Requirements

\- Python 3.10+

\- Node.js LTS

\- MySQL 8.0+



\## Step 1 — Database

Open MySQL and run:

CREATE DATABASE hospitaldebt\_ai;

Then import schema from database/schema.sql



\## Step 2 — Backend

cd backend

python -m venv venv

venv\\Scripts\\activate        (Windows)

source venv/bin/activate     (Mac/Linux)

pip install -r requirements.txt

python train\_models.py

python app.py



\## Step 3 — Frontend

cd frontend

npm install

npm start



\## Done!

Backend runs at http://localhost:5000

Frontend runs at http://localhost:3000



