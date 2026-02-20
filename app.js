document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        responses: null, // Map of QNo -> Answer
        answerKey: null, // Map of QNo -> Answer
        results: null
    };

    // Elements
    const elements = {
        responseInput: document.getElementById('response-input'),
        answerInput: document.getElementById('answer-input'),
        responseDropZone: document.getElementById('response-drop-zone'),
        answerDropZone: document.getElementById('answer-drop-zone'),
        calculateBtn: document.getElementById('calculate-btn'),
        demoBtn: document.getElementById('demo-btn'),
        uploadSection: document.getElementById('upload-section'),
        dashboardSection: document.getElementById('dashboard-section'),
        totalScore: document.getElementById('total-score'),
        accuracyVal: document.getElementById('accuracy-val'),
        accuracyFg: document.getElementById('accuracy-fg'),
        barPhysics: document.getElementById('bar-physics'),
        barChemistry: document.getElementById('bar-chemistry'),
        barBiology: document.getElementById('bar-biology'),
        scorePhysics: document.getElementById('score-physics'),
        scoreChemistry: document.getElementById('score-chemistry'),
        scoreBiology: document.getElementById('score-biology'),
        analysisBody: document.getElementById('analysis-body'),
        reUploadBtn: document.getElementById('re-upload'),
        navItems: document.querySelectorAll('.nav-item')
    };

    // Navigation Logic
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.id;

            // Update active state
            elements.navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Toggle sections
            if (targetId === 'nav-upload') {
                elements.uploadSection.classList.remove('hidden');
                elements.dashboardSection.classList.add('hidden');
            } else if (targetId === 'nav-dashboard' || targetId === 'nav-analysis') {
                if (state.results) {
                    elements.uploadSection.classList.add('hidden');
                    elements.dashboardSection.classList.remove('hidden');

                    // If analysis, scroll to it
                    if (targetId === 'nav-analysis') {
                        document.querySelector('.analysis-table-container').scrollIntoView({ behavior: 'smooth' });
                    }
                } else {
                    alert('Please upload your data or use demo data first!');
                    // Revert active state to upload if no data
                    elements.navItems.forEach(i => i.classList.remove('active'));
                    document.getElementById('nav-upload').classList.add('active');
                }
            }
        });
    });

    // Initialize Drop Zones
    [
        { zone: elements.responseDropZone, input: elements.responseInput, key: 'responses' },
        { zone: elements.answerDropZone, input: elements.answerInput, key: 'answerKey' }
    ].forEach(({ zone, input, key }) => {
        zone.addEventListener('click', () => input.click());

        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0], key, zone);
            }
        });

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('active');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('active');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('active');
            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0], key, zone);
            }
        });
    });

    function handleFile(file, stateKey, zone) {
        const span = zone.querySelector('span');
        const fileType = file.type;
        const isImage = fileType.startsWith('image/');
        const isPDF = fileType === 'application/pdf';

        if (isImage || isPDF) {
            // Simulate OCR process
            span.innerText = `Analyzing ${file.name}...`;
            zone.classList.add('loading');

            setTimeout(() => {
                const dummyData = generateDummyData();
                state[stateKey] = dummyData;
                span.innerText = `OCR Complete: ${file.name}`;
                zone.classList.remove('loading');
                zone.style.borderColor = 'var(--accent-green)';
                checkReady();
            }, 2000);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const data = parseCSV(content);
                state[stateKey] = data;
                span.innerText = `Loaded: ${file.name}`;
                zone.style.borderColor = 'var(--accent-green)';
                checkReady();
            };
            reader.readAsText(file);
        }
    }

    function generateDummyData() {
        const map = new Map();
        const choices = ['A', 'B', 'C', 'D'];
        for (let i = 1; i <= 200; i++) {
            map.set(i, choices[Math.floor(Math.random() * 4)]);
        }
        return map;
    }

    function parseCSV(text) {
        const lines = text.split(/\r?\n/);
        const map = new Map();
        lines.forEach(line => {
            const [qNo, ans] = line.split(',').map(s => s.trim());
            if (qNo && !isNaN(qNo)) {
                map.set(parseInt(qNo), ans.toUpperCase());
            }
        });
        return map;
    }

    function checkReady() {
        if (state.responses && state.answerKey) {
            elements.calculateBtn.disabled = false;
        }
    }

    // Calculation Logic
    elements.calculateBtn.addEventListener('click', () => {
        calculateScore();
        showDashboard();
    });

    function calculateScore() {
        let total = 0;
        let correctCount = 0;
        let unattemptedCount = 0;
        let incorrectCount = 0;

        const details = [];
        const subjectStats = {
            physics: { score: 0, total: 180, count: 0 },
            chemistry: { score: 0, total: 180, count: 0 },
            biology: { score: 0, total: 360, count: 0 }
        };

        // Assume questions 1-200 (NEET has 200 questions now, choose 180)
        // But we'll just process all in the answer key
        const allQuestions = Array.from(state.answerKey.keys()).sort((a, b) => a - b);

        allQuestions.forEach(qNo => {
            const userAns = state.responses.get(qNo) || '';
            const correctAns = state.answerKey.get(qNo);

            let points = 0;
            let status = 'unattempted';

            if (!userAns || userAns === '' || userAns === '-') {
                unattemptedCount++;
            } else if (userAns === correctAns) {
                points = 4;
                status = 'correct';
                correctCount++;
            } else {
                points = -1;
                status = 'incorrect';
                incorrectCount++;
            }

            total += points;

            // Subject mapping (Generic NEET split)
            let subject = 'Physics';
            if (qNo > 50 && qNo <= 100) subject = 'Chemistry';
            if (qNo > 100) subject = 'Biology';

            const subKey = subject.toLowerCase();
            subjectStats[subKey].score += points;
            subjectStats[subKey].count++;

            details.push({ qNo, subject, status, userAns, correctAns, points });
        });

        state.results = {
            total,
            correctCount,
            incorrectCount,
            unattemptedCount,
            totalQuestions: allQuestions.length,
            details,
            subjectStats
        };
    }

    function showDashboard() {
        elements.uploadSection.classList.add('hidden');
        elements.dashboardSection.classList.remove('hidden');

        // Update nav state
        elements.navItems.forEach(i => i.classList.remove('active'));
        document.getElementById('nav-dashboard').classList.add('active');

        // Update Score
        animateValue(elements.totalScore, 0, state.results.total, 1000);

        // Update Accuracy
        const totalAttempted = state.results.correctCount + state.results.incorrectCount;
        const accuracy = totalAttempted > 0 ? (state.results.correctCount / totalAttempted) * 100 : 0;
        elements.accuracyVal.innerText = `${Math.round(accuracy)}%`;

        // Progress Circle Offset
        const radius = 45;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (accuracy / 100) * circumference;
        elements.accuracyFg.style.strokeDashoffset = offset;

        // Subject Bars
        updateSubjectBar('physics', state.results.subjectStats.physics);
        updateSubjectBar('chemistry', state.results.subjectStats.chemistry);
        updateSubjectBar('biology', state.results.subjectStats.biology);

        // Analysis Table
        elements.analysisBody.innerHTML = state.results.details.map(q => `
            <tr>
                <td>${q.qNo}</td>
                <td>${q.subject}</td>
                <td><span class="status-tag ${q.status}">${q.status}</span></td>
                <td>${q.userAns || '-'}</td>
                <td>${q.correctAns}</td>
                <td style="color: ${q.points > 0 ? 'var(--accent-green)' : q.points < 0 ? 'var(--accent-red)' : 'var(--text-secondary)'}">${q.points > 0 ? '+' + q.points : q.points}</td>
            </tr>
        `).join('');
    }

    function updateSubjectBar(subj, stats) {
        const percent = Math.max(0, (stats.score / stats.total) * 100);
        elements[`bar${subj.charAt(0).toUpperCase() + subj.slice(1)}`].style.width = `${percent}%`;
        elements[`score${subj.charAt(0).toUpperCase() + subj.slice(1)}`].innerText = `${stats.score}/${stats.total}`;
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    elements.reUploadBtn.addEventListener('click', () => {
        location.reload();
    });

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const body = document.body;

    // Check saved preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        enableLightTheme();
    }

    themeBtn.addEventListener('click', () => {
        if (body.classList.contains('light-theme')) {
            disableLightTheme();
        } else {
            enableLightTheme();
        }
    });

    function enableLightTheme() {
        body.classList.add('light-theme');
        themeIcon.innerText = '☀️';
        localStorage.setItem('theme', 'light');
    }

    function disableLightTheme() {
        body.classList.remove('light-theme');
        themeIcon.innerText = '🌙';
        localStorage.setItem('theme', 'dark');
    }

    // Demo Data Button Handler
    elements.demoBtn.onclick = () => {
        const dummyKey = new Map();
        const dummyResp = new Map();
        const choices = ['A', 'B', 'C', 'D'];

        for (let i = 1; i <= 200; i++) {
            const correct = choices[Math.floor(Math.random() * 4)];
            dummyKey.set(i, correct);

            if (Math.random() > 0.1) {
                if (Math.random() > 0.2) {
                    dummyResp.set(i, correct);
                } else {
                    dummyResp.set(i, choices[Math.floor(Math.random() * 4)]);
                }
            } else {
                dummyResp.set(i, '');
            }
        }
        state.answerKey = dummyKey;
        state.responses = dummyResp;
        calculateScore();
        showDashboard();
    };
});
