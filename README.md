# Smart Oilseed Advisor

A production-ready Flask web application with a hardened backend, JWT-based secure authentication, and a modern frontend interface.

## 🚀 Local Development (Quick Start)

The easiest way to run the application locally is to simply double-click the included batch script:

**`Start_Advisor.bat`**

This script will automatically:
1. Detect if you have Python installed globally, OR
2. Fall back to the portable Python environment automatically downloaded in the project folder.
3. Launch the secure Flask backend.

Once the terminal says `* Running on http://127.0.0.1:5000`, open your web browser and navigate to:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**

*(Do NOT open `public/index.html` directly in your browser. Always access it through the Flask server at port 5000 to ensure the APIs and authentication work correctly).*

---

## ☁️ Production Deployment

The project has been heavily refactored to be compatible with all major cloud providers.

### 1. Vercel (Easiest)
Simply run the following command in your terminal:
```bash
npx vercel --prod
```
The included `vercel.json` will automatically route the `/api` requests to Flask and serve the static files from `/public`.

### 2. Render / Railway
Connect your GitHub repository to Render or Railway. 
- The included **`Procfile`** is pre-configured to launch Gunicorn (`gunicorn --workers 4 --threads 2 --timeout 30 app:app`).
- The necessary packages are in `requirements.txt`.

### 3. Docker / AWS
A **`Dockerfile`** is included for containerized deployment.
```bash
docker build -t oilseed-advisor .
docker run -p 5000:5000 --env-file .env oilseed-advisor
```

## 🔒 Security Features Implemented
- Isolated static assets (`/public`)
- JWT-based Auth (HttpOnly + CSRF protected)
- Rate-Limiting via Flask-Limiter
- Schema validation via Marshmallow
- Secure DB Connection Pool via SQLAlchemy
- Security Headers via Flask-Talisman
