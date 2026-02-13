const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { instrument } = require("@socket.io/admin-ui");

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true
    }
});

instrument(io, { auth: false, mode: "development" });



app.use(express.static("public"));

/* ---------------- PLAYERS ---------------- */

const players = {};

/* ---------------- QUESTIONS ---------------- */

const questionBank = [
    {
        question: "HTTP is primarily?",
        options: ["Stateful", "Stateless", "Persistent", "Encrypted only"],
        correct: 1
    },
    {
        question: "WebSocket allows?",
        options: ["Only server responses", "Only client requests", "Bidirectional communication", "File downloads only"],
        correct: 2
    },
    {
        question: "Which protocol upgrade enables WebSocket?",
        options: ["DNS", "HTTP Upgrade", "FTP Switch", "TCP Reset"],
        correct: 1
    },
    {
        question: "Polling means:",
        options: ["Server pushes updates", "Client repeatedly asks server", "Database caching", "Packet routing"],
        correct: 1
    },
    {
        question: "Why is polling inefficient?",
        options: ["Too secure", "Wastes requests when nothing changes", "Too fast", "Uses UDP"],
        correct: 1
    },
    {
        question: "WebSocket connection stays:",
        options: ["Closed after response", "Persistent", "Random", "Encrypted only"],
        correct: 1
    },
    {
        question: "Realtime chat apps use:",
        options: ["REST only", "WebSocket", "SMTP", "ARP"],
        correct: 1
    },
    {
        question: "Who decides winner in a realtime quiz?",
        options: ["Fastest click", "Client clock", "Server arrival time", "Browser refresh"],
        correct: 2
    },
    {
        question: "Latency affects:",
        options: ["Only UI", "Only database", "Order of message arrival", "CSS rendering"],
        correct: 2
    },
    {
        question: "Socket.IO is built on top of:",
        options: ["HTTP + WebSocket transport", "Bluetooth", "USB", "SMTP"],
        correct: 0
    },
    {
        question: "In distributed systems, clients are:",
        options: ["Always trusted", "Never trusted", "The database", "The router"],
        correct: 1
    }
];

let lastQuestionIndex = -1;

/* ---------------- GAME STATE ---------------- */

let currentQuestion = null;
let answered = false;

/* ---------------- QUESTION LOOP ---------------- */

function sendQuestion() {

    answered = false;

    let index;
    do {
        index = Math.floor(Math.random() * questionBank.length);
    } while (index === lastQuestionIndex);

    lastQuestionIndex = index;
    const q = questionBank[index];

    currentQuestion = {
        id: Date.now(),
        question: q.question,
        options: q.options,
        correct: q.correct
    };

    io.emit("new_question", {
        id: currentQuestion.id,
        question: currentQuestion.question,
        options: currentQuestion.options
    });

    console.log("Question:", currentQuestion.question);
}

setInterval(sendQuestion, 15000);

/* ---------------- SOCKET CONNECTION ---------------- */

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    /* -------- PLAYER JOIN -------- */

    socket.on("join_game", (data) => {

        players[socket.id] = {
            name: data.name,
            score: 0
        };

        io.emit("leaderboard_update", players);

        console.log(`${data.name} joined`);
    });
   
    /* -------- ANSWER -------- */

    socket.on("answer", (data) => {

        if (!currentQuestion) return;
        if (!players[socket.id]) return;
        if (data.questionId !== currentQuestion.id) return;
        if (answered) return;

        const correct = data.answer === currentQuestion.correct;

        if (correct) {
            answered = true;

            players[socket.id].score++;

            io.emit("winner", {
                socketId: socket.id,
                name: players[socket.id].name
            });

            io.emit("leaderboard_update", players);

            console.log("Winner:", players[socket.id].name);
        }
    });

    /* -------- DISCONNECT -------- */

    socket.on("disconnect", () => {

        if (players[socket.id]) {
            console.log(players[socket.id].name, "disconnected");
            delete players[socket.id];
            io.emit("leaderboard_update", players);
        }
    });

});

/* ---------------- START SERVER ---------------- */

server.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT);
});
