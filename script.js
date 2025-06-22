document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // Game variables
    let score = 0;
    let trees = [];

    // Tree class
    class Tree {
        constructor(x, y, height = 10, width = 5, color = 'saddlebrown') {
            this.x = x;
            this.y = y; // Base of the trunk
            this.height = height;
            this.width = width;
            this.color = color;
            this.leaves = []; // To store leaf objects
            this.roots = [];  // To store root objects
            this.fruits = 0;
        }

        draw() {
            // Draw trunk
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);

            // Draw leaves (simple representation for now)
            this.leaves.forEach(leaf => leaf.draw());

            // Draw roots (simple representation for now)
            this.roots.forEach(root => root.draw());

            // TODO: Draw fruits
        }

        growHeight(amount = 10) {
            this.height += amount;
            console.log(`Tree height increased to: ${this.height}`);
            updateScore(); // Score might depend on height
        }

        growWidth(amount = 2) {
            this.width += amount;
            console.log(`Tree width increased to: ${this.width}`);
            updateScore(); // Score might depend on width/volume
        }

        addLeaf(size = 10, color = 'green') {
            // For simplicity, add leaves at the top of the trunk
            // More complex positioning can be added later
            const leafX = this.x + (Math.random() * this.width) - (this.width / 2);
            const leafY = this.y - this.height - (size / 2) + (Math.random() * -20); // Slightly above the trunk
            this.leaves.push(new Leaf(leafX, leafY, size, color));
            console.log('Leaf added');
        }

        addRoot(length = 20, direction = 'down') {
            // For simplicity, roots start from the base of the trunk
            let rootX = this.x;
            let rootY = this.y;
            this.roots.push(new Root(rootX, rootY, length, this.width / 4, direction));
            console.log(`Root added, direction: ${direction}`);
        }

        produceFruit() {
            if (this.height >= 50) { // Example condition: Tree must be tall enough
                this.fruits += 1;
                console.log(`Fruit produced. Total fruits: ${this.fruits}`);
                updateScore(); // Score depends on fruits
                document.getElementById('plant-new-tree-button').disabled = false;
            } else {
                console.log('Tree is not tall enough to produce fruit.');
            }
        }

        getScore() {
            // Basic score: height + volume (width as proxy) + fruits
            const volumeScore = this.width * this.height / 10; // Example volume calculation
            return Math.round(this.height + volumeScore + (this.fruits * 5));
        }
    }

    class Leaf {
        constructor(x, y, size, color) {
            this.x = x;
            this.y = y;
            this.size = size; // Diameter of the circle
            this.color = color;
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    class Root {
        constructor(startX, startY, length, thickness, direction) {
            this.startX = startX;
            this.startY = startY;
            this.length = length;
            this.thickness = thickness;
            this.direction = direction; // 'left', 'right', 'down'
            this.color = 'peru';
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            let endX = this.startX;
            let endY = this.startY;

            switch (this.direction) {
                case 'left':
                    endX -= this.length;
                    break;
                case 'right':
                    endX += this.length;
                    break;
                case 'down':
                default:
                    endY += this.length;
                    break;
            }
            // Simple line for root
            ctx.lineWidth = this.thickness;
            ctx.strokeStyle = this.color; // Use strokeStyle for lines
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.lineWidth = 1; // Reset line width
        }
    }


    // UI Elements
    const growHeightButton = document.getElementById('grow-height-button');
    const growRootsButton = document.getElementById('grow-roots-button');
    const growLeavesButton = document.getElementById('grow-leaves-button');
    const produceFruitButton = document.getElementById('produce-fruit-button');
    const plantNewTreeButton = document.getElementById('plant-new-tree-button');
    const scoreDisplay = document.getElementById('current-score');

    // Game Setup
    const GROUND_LEVEL_OFFSET = 20; // Pixels from the bottom for the ground

    function initializeGame() {
        resizeCanvas(); // Call resizeCanvas first to set correct canvas dimensions

        // Create the first tree
        if (trees.length === 0) {
            const initialTreeX = canvas.width / 2;
            const initialTreeY = canvas.height - GROUND_LEVEL_OFFSET;
            trees.push(new Tree(initialTreeX, initialTreeY));
        }
        updateButtonStates(); // Centralized button state management
        gameLoop();
    }

    function resizeCanvas() {
        const gameContainer = document.getElementById('game-container');
        canvas.width = gameContainer.clientWidth;
        canvas.height = gameContainer.clientHeight;
        drawGame(); // Redraw everything after resize
    }

    window.addEventListener('resize', resizeCanvas);

    function updateButtonStates() {
        // Produce fruit button
        if (trees.some(tree => tree.height >= 50)) {
            produceFruitButton.disabled = false;
        } else {
            produceFruitButton.disabled = true;
        }

        // Plant new tree button
        if (trees.some(tree => tree.fruits > 0)) {
            plantNewTreeButton.disabled = false;
        } else {
            plantNewTreeButton.disabled = true;
        }
    }

    function updateScore() {
        score = 0;
        trees.forEach(tree => {
            score += tree.getScore();
        });
        scoreDisplay.textContent = score;
        updateButtonStates(); // Update button states whenever score (and potentially game state) changes
    }

    // Game Loop
    function gameLoop() {
        drawGame(); // All drawing handled by drawGame

        // Request next frame
        requestAnimationFrame(gameLoop);
    }

    function drawGame() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw ground (simple line)
        ctx.strokeStyle = 'SaddleBrown'; // Color for the ground line
        ctx.lineWidth = 4; // Thickness of the ground line
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - GROUND_LEVEL_OFFSET + 2); // +2 to align with trunk base visually
        ctx.lineTo(canvas.width, canvas.height - GROUND_LEVEL_OFFSET + 2);
        ctx.stroke();
        ctx.lineWidth = 1; // Reset line width

        // Update and draw game objects
        trees.forEach(tree => tree.draw());
    }

    // Event Listeners for UI
    growHeightButton.addEventListener('click', () => {
        if (trees.length > 0) {
            // For now, affect the first tree. Later, we'll need a way to select a tree.
            trees[0].growHeight();
            trees[0].growWidth(0.5); // Trunk gets slightly wider as it grows taller
            updateScore();
        }
    });

    growRootsButton.addEventListener('click', () => {
        if (trees.length > 0) {
            // For now, affect the first tree.
            // Let's add a root downwards by default.
            // Could add UI to choose direction later.
            const directions = ['left', 'right', 'down'];
            const randomDirection = directions[Math.floor(Math.random() * directions.length)];
            trees[0].addRoot(20 + Math.random()*10, randomDirection);
            updateScore(); // Roots might not directly add to score, but are essential
        }
    });

    growLeavesButton.addEventListener('click', () => {
        if (trees.length > 0) {
            // For now, affect the first tree.
            trees[0].addLeaf(10 + Math.random() * 5); // Random leaf size
            updateScore(); // Leaves might contribute to score or resource generation
        }
    });

    produceFruitButton.addEventListener('click', () => {
        if (trees.length > 0) {
            // For now, affect the first tree.
            trees[0].produceFruit();
            updateScore();
        }
    });

    plantNewTreeButton.addEventListener('click', () => {
        const parentTree = trees.find(tree => tree.fruits > 0);
        if (parentTree) {
            parentTree.fruits--; // Use one fruit to plant a new tree

            const newX = Math.random() * (canvas.width - 60) + 30; // Random X, away from edges
            const newY = canvas.height - GROUND_LEVEL_OFFSET; // Base of the trunk

            // TODO: Later, allow choosing tree type
            const newTree = new Tree(newX, newY);
            trees.push(newTree);

            console.log('New tree planted.');
            updateScore(); // This will also call updateButtonStates

            // No need to manually disable plantNewTreeButton here,
            // updateScore() -> updateButtonStates() will handle it.
        } else {
            console.log('No tree has fruit to plant a new one.');
            // updateButtonStates() called via updateScore() will ensure the button is disabled if necessary
        }
    });

    // Initialize the game
    initializeGame();
});
