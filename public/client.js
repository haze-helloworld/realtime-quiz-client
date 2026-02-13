/* ================= SERVER URL ================= */
/* change after deploy */
const SERVER_URL = window.location.hostname === "localhost"
    ? undefined
    : "https://YOUR-RENDER-URL.onrender.com";

let socket = null;

/* ================= DOM ================= */

const status = document.getElementById("status");
const quiz = document.getElementById("quiz");
const leaderboardDiv = document.getElementById("leaderboard");

const joinPanel = document.getElementById("joinPanel");
const joinBtn = document.getElementById("joinBtn");
const nameInput = document.getElementById("nameInput");

const playerNameLabel = document.getElementById("playerName");
const playerIdLabel = document.getElementById("playerId");
const identityDiv = document.getElementById("identity");

/* ================= STATE ================= */

let currentQuestion = null;
let answered = false;
let myName = "";
let resultShownForQuestion = null;

/* ================= JOIN GAME ================= */

joinBtn.onclick = () => {

    if (socket) return; // prevent double joins

    myName = nameInput.value.trim();
    if (!myName) return alert("Enter a name");

    socket = io(SERVER_URL, { transports: ["websocket"] });

    socket.on("connect", () => {

        status.className = "status connected";
        status.innerText = "Connected";

        socket.emit("join_game", { name: myName });

        joinPanel.style.display = "none";
        identityDiv.style.display = "block";

        playerNameLabel.innerText = myName;
        playerIdLabel.innerText = socket.id;
    });

    socket.on("disconnect", () => {
        status.className = "status disconnected";
        status.innerText = "Reconnecting...";
    });

    registerSocketEvents();
};

/* ================= SOCKET EVENTS ================= */

function registerSocketEvents() {

    /* -------- NEW QUESTION -------- */

    socket.on("new_question", (q) => {

        currentQuestion = q;
        answered = false;
        resultShownForQuestion = null;

        quiz.replaceChildren();

        /* question number */
        const numberDiv = document.createElement("div");
        numberDiv.className = "question-number";
        numberDiv.textContent = `Question ${q.number} / ${q.total}`;

        const questionDiv = document.createElement("div");
        questionDiv.className = "question";
        questionDiv.textContent = q.question;

        const optionsDiv = document.createElement("div");
        optionsDiv.className = "options";

        q.options.forEach((opt, index) => {

            const btn = document.createElement("button");
            btn.className = "option";
            btn.textContent = opt;
            btn.type = "button";

            btn.onclick = () => {

                if (answered) return;
                answered = true;

                optionsDiv.querySelectorAll("button").forEach(b => b.disabled = true);

                socket.emit("answer", {
                    questionId: q.id,
                    answer: index
                });
            };

            optionsDiv.appendChild(btn);
        });

        quiz.appendChild(numberDiv);
        quiz.appendChild(questionDiv);
        quiz.appendChild(optionsDiv);
    });

    /* -------- WINNER -------- */

    socket.on("winner", (data) => {

        if (resultShownForQuestion === currentQuestion?.id) return;
        resultShownForQuestion = currentQuestion?.id;

        answered = true;

        const resultDiv = document.createElement("div");

        if (data.socketId === socket.id) {
            resultDiv.className = "result win";
            resultDiv.innerText = "🎉 Correct Answer!";
        } else {
            resultDiv.className = "result lose";
            resultDiv.innerText = `${data.name} answered first`;
        }

        quiz.appendChild(resultDiv);
    });

    /* -------- LEADERBOARD -------- */

    socket.on("leaderboard_update", (board) => {

        const sorted = Object.entries(board)
            .sort((a, b) => b[1].score - a[1].score);

        leaderboardDiv.replaceChildren();

        sorted.forEach(([id, player], index) => {

            const row = document.createElement("div");
            row.className = "player";

            if (id === socket.id) row.classList.add("you");

            const displayName = id === socket.id ? "You" : player.name;

            row.innerHTML = `
                <span>#${index + 1} ${displayName}</span>
                <span>${player.score}</span>
            `;

            leaderboardDiv.appendChild(row);
        });
    });
}
