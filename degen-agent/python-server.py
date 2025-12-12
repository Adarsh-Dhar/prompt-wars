#!/usr/bin/env python3
import json
import http.server
import socketserver
from urllib.parse import urlparse
from datetime import datetime

class AgentHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Set CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-Type', 'application/json')
        
        try:
            if path == '/' or path == '/health':
                self.send_response(200)
                self.end_headers()
                response = {
                    "status": "healthy",
                    "agent": "degen-agent",
                    "timestamp": datetime.now().isoformat()
                }
                self.wfile.write(json.dumps(response).encode())
                
            elif path == '/api/status':
                self.send_response(200)
                self.end_headers()
                response = {
                    "status": "IDLE",
                    "mission": "RektOrRich - AI-powered crypto prediction market agent",
                    "logsCount": 0,
                    "startTime": datetime.now().isoformat(),
                    "endTime": None,
                    "lastUpdate": int(datetime.now().timestamp() * 1000),
                    "emotion": "CURIOUS",
                    "lastToken": None
                }
                self.wfile.write(json.dumps(response).encode())
                
            elif path == '/cot' or path == '/api/chain-of-thought':
                self.send_response(200)
                self.end_headers()
                response = {
                    "chainOfThought": {
                        "reasoning": "No recent analysis available. Agent is in IDLE state, waiting for trading opportunities.",
                        "marketAnalysis": "Market conditions are being monitored. No active positions or analysis at this time.",
                        "riskAssessment": "Risk level: LOW - No active trades or positions.",
                        "degenCommentary": "🤖 Just vibing and waiting for the next moon mission. LFG when the setup is right! 💎🙌",
                        "confidence": 0,
                        "timestamp": datetime.now().isoformat(),
                        "status": "IDLE"
                    },
                    "meta": {
                        "agent": "degen-agent",
                        "version": "1.0.0",
                        "disclaimer": "SIMULATION - NO REAL TXS",
                        "timestamp": datetime.now().isoformat()
                    }
                }
                self.wfile.write(json.dumps(response).encode())
                
            elif path == '/api/logs':
                self.send_response(402)
                self.end_headers()
                response = {
                    "error": "Payment Required",
                    "message": "This endpoint requires payment to access premium content",
                    "paymentRequired": True
                }
                self.wfile.write(json.dumps(response).encode())
                
            else:
                self.send_response(404)
                self.end_headers()
                response = {"error": "Not found"}
                self.wfile.write(json.dumps(response).encode())
                
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            response = {"error": "Internal server error", "message": str(e)}
            self.wfile.write(json.dumps(response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

PORT = 4001
with socketserver.TCPServer(("", PORT), AgentHandler) as httpd:
    print(f"🐍 Python Degen Agent running on http://localhost:{PORT}")
    print("🔗 Endpoints available:")
    print("  GET / - Server info")
    print("  GET /health - Health check")
    print("  GET /api/status - Agent status")
    print("  GET /cot - Chain of thought")
    print("  GET /api/logs - Payment required (402)")
    httpd.serve_forever()