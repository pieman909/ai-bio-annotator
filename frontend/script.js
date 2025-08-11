// --- IMPORTANT ---
// This URL points to the backend server running on your computer.
const API_URL = 'http://localhost:3000/analyze';

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const imageLoader = document.getElementById('imageLoader');
const analyzeBtn = document.getElementById('analyzeBtn');
const diagramContainer = document.getElementById('diagram-container');
const diagramImage = document.getElementById('diagram-image');
const overlaySVG = document.getElementById('overlay-svg');
const loader = document.getElementById('loader');
const summaryContainer = document.getElementById('summary-container');
const summaryText = document.getElementById('summary-text');
const quizContainer = document.getElementById('quiz-container');
const quizContent = document.getElementById('quiz-content');

analyzeBtn.addEventListener('click', handleAnalysis);

async function handleAnalysis() {
    const apiKey = apiKeyInput.value;
    const imageFile = imageLoader.files[0];
    if (!apiKey || !imageFile) {
        alert('Please provide both an API key and an image file.');
        return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('apiKey', apiKey);
    formData.append('image', imageFile);

    try {
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'An unknown server error occurred.');
        }
        const data = await response.json();

        diagramImage.src = URL.createObjectURL(imageFile);
        diagramImage.onload = () => {
            setLoading(false);
            displayResults(data);
        };
    } catch (error) {
        alert('Error: ' + error.message);
        setLoading(false);
    }
}

function setLoading(isLoading) {
    // Clear everything to reset the state
    diagramContainer.innerHTML = '';
    summaryContainer.style.display = 'none';
    quizContainer.style.display = 'none';

    if (isLoading) {
        diagramContainer.appendChild(loader);
        loader.style.display = 'block';
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';
    } else {
        loader.style.display = 'none';
        diagramContainer.appendChild(diagramImage);
        diagramContainer.appendChild(overlaySVG);
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze with AI';
    }
}

function displayResults(data) {
    overlaySVG.innerHTML = '';

    if (data.summary) {
        summaryText.textContent = data.summary;
        summaryContainer.style.display = 'block';
    }

    if (data.annotations && data.annotations.length > 0) {
        data.annotations.forEach(ann => {
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const points = ann.polygon.map(p => `${p.x.replace('%','')},${p.y.replace('%','')}`).join(' ');

            polygon.setAttribute('points', points);
            polygon.setAttribute('class', 'annotation-polygon');

            overlaySVG.setAttribute('viewBox', '0 0 100 100');
            overlaySVG.setAttribute('preserveAspectRatio', 'none');

            const textBox = createTextBox(ann);
            diagramContainer.appendChild(textBox);

            polygon.addEventListener('mouseenter', () => anime({ targets: textBox, scale: 1, opacity: 1, duration: 300, easing: 'easeOutSine' }));
            polygon.addEventListener('mouseleave', () => anime({ targets: textBox, scale: 0.95, opacity: 0, duration: 300, easing: 'easeInSine' }));

            overlaySVG.appendChild(polygon);
        });
    }

    if (data.quiz && data.quiz.length > 0) {
        buildQuiz(data.quiz);
        quizContainer.style.display = 'block';
    }
}

function createTextBox(annotation) {
    const textBox = document.createElement('div');
    textBox.className = 'annotation-text-box';
    textBox.innerHTML = `
        <h4>${annotation.label}</h4>
        <p><strong>Analogy:</strong> ${annotation.analogy}</p>
        <p><strong>Function:</strong> ${annotation.function}</p>
    `;
    const firstPoint = annotation.polygon[0];
    const isLeft = parseFloat(firstPoint.x) > 50;
    textBox.style.top = firstPoint.y;
    textBox.style.transformOrigin = isLeft ? 'right center' : 'left center';
    textBox.style.left = isLeft ? `calc(${firstPoint.x} - 1.5rem)` : `calc(${firstPoint.x} + 1.5rem)`;
    textBox.style.transform = `translate(-${isLeft ? 100 : 0}%, -50%)`;
    return textBox;
}

function buildQuiz(quizData) {
    quizContent.innerHTML = '';
    quizData.forEach((item, index) => {
        const quizItem = document.createElement('div');
        quizItem.className = 'quiz-item';
        const question = document.createElement('p');
        question.textContent = `${index + 1}. ${item.question}`;
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';
        const shuffledOptions = item.options.sort(() => Math.random() - 0.5);
        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.onclick = (e) => {
                optionsDiv.querySelectorAll('button').forEach(btn => { btn.disabled = true; });
                if (option === item.answer) { e.target.classList.add('correct'); }
                else { e.target.classList.add('incorrect'); }
            };
            optionsDiv.appendChild(button);
        });
        quizItem.appendChild(question);
        quizItem.appendChild(optionsDiv);
        quizContent.appendChild(quizItem);
    });
}
