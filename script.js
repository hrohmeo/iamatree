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
            this.leaves = []; // To store leaf objects - will be deprecated for direct trunk leaves
            this.roots = [];  // To store root objects
            this.branches = []; // To store branch objects
            this.fruits = 0;
        }

        draw() {
            // Draw trunk
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);

            // Draw branches (which will draw their own leaves)
            this.branches.forEach(branch => branch.draw());

            // Draw leaves attached directly to trunk (fallback or initial leaves)
            this.leaves.forEach(leaf => leaf.draw());

            // Draw roots
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
            if (this.branches.length > 0) {
                // Add leaf to a random branch
                const randomBranch = this.branches[Math.floor(Math.random() * this.branches.length)];
                randomBranch.addLeaf(size, color);
            } else {
                // Fallback: Add leaf to trunk if no branches exist (or keep for very young trees)
                // For simplicity, add leaves near the top of the trunk
                console.log('No branches yet, adding leaf to trunk.');
                const leafX = this.x + (Math.random() * this.width) - (this.width / 2);
                // Position leaves near the top of the trunk, slightly spread out
                const leafY = (this.y - this.height) + (Math.random() * this.height * 0.2); // In the top 20% of the trunk
                this.leaves.push(new Leaf(leafX, leafY, size, color));
                // console.log('Leaf added to trunk'); // Redundant with Branch.addLeaf logging
            }
        }

        addRoot() {
            // Initial root starts from the base of the trunk
            const rootStartX = this.x;
            const rootStartY = this.y; // Base of the trunk
            const initialLength = 15 + Math.random() * 10;
            const initialThickness = Math.max(2, this.width / 3);

            // Initial angle: downwards, with some variation
            // PI/2 is straight down. Allow variation e.g. PI/2 +/- PI/6 (30 degrees)
            const baseAngle = Math.PI / 2;
            const angleVariation = Math.PI / 4; // +/- 45 degrees from straight down
            const initialAngle = baseAngle + (Math.random() * angleVariation * 2 - angleVariation);

            this.roots.push(new Root(rootStartX, rootStartY, initialLength, initialAngle, initialThickness));
            console.log(`Root added at angle: ${initialAngle}`);
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

        addBranch() {
            // Branches can sprout from different heights of the trunk
            // Ensure tree is tall enough to have a meaningful branch
            if (this.height < 30) {
                console.log("Tree is too short to add branches yet.");
                return;
            }

            const branchMinYProportion = 0.2; // Branch can start from 20% of trunk height from top
            const branchMaxYProportion = 0.8; // Branch can start up to 80% of trunk height from top
            const randomProportion = branchMinYProportion + Math.random() * (branchMaxYProportion - branchMinYProportion);

            // startY is calculated from the top of the tree downwards
            const branchStartY = (this.y - this.height) + this.height * (1 - randomProportion);

            const onLeft = Math.random() < 0.5;
            // Start branch from the side of the trunk
            const branchStartX = this.x + (onLeft ? -this.width / 2 : this.width / 2);

            // Angle: 0 radians is to the right.
            // Branches pointing slightly up or down from horizontal.
            // Left side: between PI - PI/4 and PI + PI/4 (i.e. 135 to 225 degrees)
            // Right side: between -PI/4 and PI/4 (i.e. -45 to 45 degrees)
            const angleSpread = Math.PI / 4; // Spread of 45 degrees for branch angle
            let angle;
            if (onLeft) {
                angle = Math.PI + (Math.random() * angleSpread * 2 - angleSpread); // Centered around PI
            } else {
                angle = (Math.random() * angleSpread * 2 - angleSpread); // Centered around 0
            }

            const length = (this.height / 5) + Math.random() * (this.height / 4); // Branch length relative to tree height
            const thickness = Math.max(1, this.width / 4); // Branch thickness relative to trunk width

            this.branches.push(new Branch(this, branchStartX, branchStartY, length, angle, thickness, this.color));
            console.log('Branch added');
        }
    }

    class Branch {
        constructor(parentTree, startX, startY, length, angle, thickness, color) {
            this.parentTree = parentTree; // Keep a reference if needed, e.g. for color
            this.startX = startX;
            this.startY = startY;
            this.length = length;
            this.angle = angle; // Angle in radians
            this.thickness = thickness;
            this.color = color; // Inherit color from parent tree or specify
            this.leaves = [];
            this.endX = this.startX + Math.cos(this.angle) * this.length;
            this.endY = this.startY + Math.sin(this.angle) * this.length;
        }

        draw() {
            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(this.endX, this.endY);
            ctx.lineWidth = this.thickness;
            ctx.strokeStyle = this.color; // Use strokeStyle for lines
            ctx.stroke();

            // Draw leaves on this branch
            this.leaves.forEach(leaf => leaf.draw());
        }

        // Method to add leaves specifically to this branch
        addLeaf(size = 8, color = 'limegreen') {
            // Add leaves along the branch, not just at the end
            const positionOnBranch = 0.2 + Math.random() * 0.8; // From 20% to 100% along the branch

            // Base leaf position on the branch line
            const leafBaseX = this.startX + Math.cos(this.angle) * this.length * positionOnBranch;
            const leafBaseY = this.startY + Math.sin(this.angle) * this.length * positionOnBranch;

            // Add some offset perpendicular to the branch angle to simulate leaves sprouting off
            const perpendicularOffset = (Math.random() - 0.5) * size * 3; // Random offset distance
            const leafX = leafBaseX + Math.sin(this.angle) * perpendicularOffset;
            const leafY = leafBaseY - Math.cos(this.angle) * perpendicularOffset;

            this.leaves.push(new Leaf(leafX, leafY, size, color));
            console.log('Leaf added to branch');
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
        constructor(startX, startY, length, angle, thickness, depth = 0) { // Added depth
            this.startX = startX;
            this.startY = startY;
            this.length = length;
            this.angle = angle; // Angle in radians (0 is right, PI/2 is down)
            this.thickness = Math.max(1, thickness - depth); // Roots get thinner with depth
            this.color = 'peru';
            this.depth = depth; // How many segments away from the main root
            this.childRoots = [];

            this.endX = this.startX + Math.cos(this.angle) * this.length;
            this.endY = this.startY + Math.sin(this.angle) * this.length;

            // Attempt to branch if not too deep
            if (this.depth < 3 && Math.random() < 0.3) { // 30% chance to branch, max depth 3
                this.tryBranch();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(this.endX, this.endY);
            ctx.lineWidth = this.thickness;
            ctx.strokeStyle = this.color;
            ctx.stroke();

            this.childRoots.forEach(child => child.draw());
        }

        tryBranch() {
            // Add 1 or 2 child roots
            const numBranches = Math.random() < 0.7 ? 1 : 2; // 70% chance for 1 branch, 30% for 2
            for (let i = 0; i < numBranches; i++) {
                const newAngle = this.angle + (Math.random() * Math.PI / 3 - Math.PI / 6); // Branch off +/- 30 degrees
                const newLength = this.length * (0.6 + Math.random() * 0.2); // Shorter than parent
                if (newLength < 2) continue; // Min length for a root segment

                this.childRoots.push(new Root(this.endX, this.endY, newLength, newAngle, this.thickness, this.depth + 1));
            }
        }
    }


    // UI Elements
    const growHeightButton = document.getElementById('grow-height-button');
    const growRootsButton = document.getElementById('grow-roots-button');
    const growLeavesButton = document.getElementById('grow-leaves-button');
    const addBranchButton = document.getElementById('add-branch-button'); // New button
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
            trees[0].addRoot(); // New addRoot doesn't need parameters here
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

    addBranchButton.addEventListener('click', () => {
        if (trees.length > 0) {
            trees[0].addBranch();
            // updateScore(); // Branches might contribute to score later
        }
    });

    // Initialize the game
    initializeGame();
});
