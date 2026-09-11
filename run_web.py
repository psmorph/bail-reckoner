"""Start the Bail Reckoner web application (FastAPI + frontend)."""
import uvicorn

if __name__ == "__main__":
    print("\n  Bail Reckoner — Web Application")
    print("  ================================")
    print("  Open http://127.0.0.1:8000 in your browser\n")
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=True)
