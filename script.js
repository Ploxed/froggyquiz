// Initialize Supabase client
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://cnkqbxlpfvcpwlkocwwf.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentGameId = null;
let currentPlayerId = null;
let currentQuestionIndex = 0;
let playerScore = 0;

// Event listeners for buttons
document.getElementById('createGame').addEventListener('click', createGame);
document.getElementById('joinGame').addEventListener('click', joinGame);
document.getElementById('nextQuestion').addEventListener('click', loadNextQuestion);
document.getElementById('playAgain').addEventListener('click', () => location.reload());

// Function to create a new game
async function createGame() {
    const gameCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const { data, error } = await supabase
        .from('games')
        .insert([{ code: gameCode }])
        .select()
        .single();

    if (error) {
        console.error('Error creating game:', error);
        return;
    }

    currentGameId = data.id;
    currentPlayerId = await joinGameById(currentGameId);
    document.getElementById('game-setup').style.display = 'none';
    document.getElementById('question-container').style.display = 'block';
    loadNextQuestion();
}

// Function to join an existing game
async function joinGame() {
    const gameCode = document.getElementById('gameCode').value.toUpperCase();
    const { data, error } = await supabase
        .from('games')
        .select('id')
        .eq('code', gameCode)
        .single();

    if (error || !data) {
        console.error('Error joining game:', error);
        alert('Game not found.');
        return;
    }

    currentGameId = data.id;
    currentPlayerId = await joinGameById(currentGameId);
    document.getElementById('game-setup').style.display = 'none';
    document.getElementById('question-container').style.display = 'block';
    loadNextQuestion();
}

// Function to join a game by ID
async function joinGameById(gameId) {
    const { data, error } = await supabase
        .from('players')
        .insert([{ game_id: gameId }])
        .select()
        .single();

    if (error) {
        console.error('Error joining game:', error);
        return null;
    }

    return data.id;
}

// Function to load the next question
async function loadNextQuestion() {
    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('game_id', currentGameId)
        .order('id', { ascending: true });

    if (error) {
        console.error('Error loading questions:', error);
        return;
    }

    if (currentQuestionIndex >= data.length) {
        endGame();
        return;
    }

    const question = data[currentQuestionIndex];
    displayQuestion(question);
    currentQuestionIndex++;
}

// Function to display the current question and options
function displayQuestion(question) {
    document.getElementById('question').innerText = question.text;
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.innerText = option;
        button.addEventListener('click', () => checkAnswer(index === question.correct_index));
        optionsContainer.appendChild(button);
    });

    document.getElementById('nextQuestion').style.display = 'none';
}

// Function to check if the selected answer is correct
function checkAnswer(isCorrect) {
    if (isCorrect) {
        playerScore++;
        document.getElementById('player-score').innerText = `Your Score: ${playerScore}`;
    }

    document.getElementById('nextQuestion').style.display = 'block';
}

// Function to handle end of game
function endGame() {
    document.getElementById('question-container').style.display = 'none';
    document.getElementById('score-container').style.display = 'block';
}

// Real-time listener for new questions and player joins
supabase
    .channel('questions')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'questions' }, payload => {
        console.log('New question added:', payload.new);
        // Handle new question insertion (if needed for real-time updates)
    })
    .subscribe();

supabase
    .channel('players')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players' }, payload => {
        console.log('New player joined:', payload.new);
        // Handle new player joining (if needed for real-time updates)
    })
    .subscribe();
