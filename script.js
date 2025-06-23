document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // Game Configuration
    const gameRules = {
        minHeightForBranches: 100,
        minHeightForFruits: 250,
        minLeavesForFruits: 50,
        minBranchesForLeaves: 1, 
    };

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
             // Draw trunk (tapered)
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 2, this.y); // Bottom-left
            ctx.lineTo(this.x + this.width / 2, this.y); // Bottom-right
            ctx.lineTo(this.x, this.y - this.height);    // Top-center
            ctx.closePath();
            ctx.fill();

            // 2. Wurzeln zeichnen
            this.roots.forEach(root => root.draw());

            // 3. Äste selbst zeichnen
            this.branches.forEach(branch => branch.drawBranchItself());

            // 4. Blätter der Äste zeichnen
            this.branches.forEach(branch => branch.drawBranchLeaves());

            // 5. Blätter am Stamm zeichnen (Fallback)
            this.leaves.forEach(leaf => leaf.draw());

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
            const allBranches = this.getAllBranches(); // Get all branches, including children
            if (allBranches.length > 0) {
                // Add leaf to a random branch from the entire hierarchy
                const randomBranch = allBranches[Math.floor(Math.random() * allBranches.length)];
                randomBranch.addLeaf(size, color);
            } else {
                // Leaves can only be added if branches exist.
                console.log('Cannot add leaf: Tree has no branches.');
                // Optionally, provide user feedback here if a UI notification system exists.
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
            const rootMaxWidth = this.width * 3; // Roots can spread 3 times the current trunk width

            this.roots.push(new Root(rootStartX, rootStartY, initialLength, initialAngle, initialThickness, 0, rootMaxWidth));
            console.log(`Root added at angle: ${initialAngle}, maxWidth: ${rootMaxWidth}`);
        }

        produceFruit(count = 1) { // Add count parameter with default value
            let producedCount = 0;
            const totalLeaves = this.getTotalLeaves();

            if (this.height < gameRules.minHeightForFruits) {
                console.log(`Tree is not tall enough to produce fruit. Min height: ${gameRules.minHeightForFruits}, current: ${this.height}`);
                return; // Stop if height condition not met
            }

            if (totalLeaves < gameRules.minLeavesForFruits) {
                console.log(`Tree does not have enough leaves to produce fruit. Min leaves: ${gameRules.minLeavesForFruits}, current: ${totalLeaves}`);
                return; // Stop if leaf condition not met
            }

            for (let i = 0; i < count; i++) {
                // Conditions already checked, so we can produce fruit
                this.fruits += 1;
                producedCount++;
            }

            if (producedCount > 0) {
                console.log(`${producedCount} fruit(s) produced. Total fruits: ${this.fruits}`);
                updateScore(); // Score depends on fruits
                // Button state update will be handled by updateScore -> updateButtonStates
            }
            // No need to directly manipulate plant-new-tree-button here, updateScore will do it.
        }

        getScore() {
            // Basic score: height + volume (width as proxy) + fruits
            const volumeScore = this.width * this.height / 10; // Example volume calculation
            return Math.round(this.height + volumeScore + (this.fruits * 5));
        }

        addBranch() {
            if (this.height < gameRules.minHeightForBranches) {
                console.log(`Tree is too short for branches. Min height: ${gameRules.minHeightForBranches}, current: ${this.height}`);
                return;
            }

            // Determine the segment of the trunk eligible for branches
            // It's the part of the trunk above gameRules.minHeightForBranches
            const eligibleTrunkHeight = this.height - gameRules.minHeightForBranches;
            if (eligibleTrunkHeight <= 0) { // Should be caught by the check above, but as a safeguard
                console.log("Not enough eligible trunk height for branches.");
                return;
            }

            // Branches should start on the upper part of this eligible segment.
            // Let's say, from the very top of the eligible segment down to 80% of its length.
            // So, randomProportion determines how far down from the top of the *eligible* segment the branch starts.
            const randomProportionInEligible = Math.random() * 0.8; // Branch starts in the top 80% of the eligible segment

            // branchStartY is calculated from the ground (this.y).
            // Top of the tree is at this.y - this.height.
            // Top of the eligible segment is at this.y - this.height.
            // Bottom of the eligible segment is at this.y - gameRules.minHeightForBranches.
            const branchStartY = (this.y - this.height) + (eligibleTrunkHeight * randomProportionInEligible);


            // Start branch from the horizontal center of the trunk
            const branchStartX = this.x;

            // Angle: 0 radians is to the right.
            // Since branches now originate from the center, the angle needs to ensure they point outwards.
            // The previous angle logic was fine, as it determined direction irrespective of exact start X.
            const onLeft = Math.random() < 0.5;
            // Branches pointing slightly up or down from horizontal, BUT NOT DOWNWARDS for trunk branches.
            // Angle: 0 radians is to the right. PI (180 deg) is to the left. PI/2 (90 deg) is straight up.
            let angle;
            if (onLeft) {
                // Corrected: Left side, visuell oben links [-PI, -PI/2]
                // -PI (links) bis -PI/2 (oben)
                angle = -Math.PI / 2 - Math.random() * (Math.PI / 2);
            } else {
                // Corrected: Right side, visuell oben rechts [-PI/2, 0]
                // -PI/2 (oben) bis 0 (rechts)
                angle = -Math.random() * (Math.PI / 2);
            }

            // Calculate scale factor based on vertical position
            // eligibleTrunkHeight is the segment of the trunk where branches can grow
            const eligibleTrunkHeightForScaling = this.height - gameRules.minHeightForBranches;
            let scaleFactor = 1.0; // Default scale

            if (eligibleTrunkHeightForScaling > 0) {
                // heightFromTrunkTop is how far down from the top of the eligible segment the branch is.
                // branchStartY is measured from canvas origin (top-left).
                // Top of the tree is this.y - this.height.
                // Lowest point for branch is this.y - gameRules.minHeightForBranches
                // Highest point for branch is this.y - this.height (top of the trunk)
                
                // proportionFromTop: 0 means at the very top of eligible segment, 1 means at the very bottom.
                // branchStartY is already calculated based on randomProportionInEligible,
                // where randomProportionInEligible = 0 means top of eligible segment.
                // So, randomProportionInEligible itself can serve as proportionFromTop.
                // The existing randomProportionInEligible is Math.random() * 0.8, so it's 0 to 0.8.
                // Let's use the distance from the actual top of the tree.
                // Top of tree: this.y - this.height
                // Bottom of branchable area: this.y - MIN_TRUNK_HEIGHT_FOR_BRANCHES
                
                // Distance of branch start from the absolute top of the tree
                const distanceFromTreeTop = branchStartY - (this.y - this.height);
                
                // Normalize this distance over the total branchable height
                // If eligibleTrunkHeightForScaling is 0, this would be a problem, but we checked.
                let normalizedPosition = distanceFromTreeTop / eligibleTrunkHeightForScaling; // 0 = top, 1 = bottom

                // We want smaller branches at the top (normalizedPosition close to 0).
                // So, scaleFactor should be smaller when normalizedPosition is smaller.
                const minScale = 0.5; // Branches at the top are 50% of standard size
                const maxScale = 1.0; // Branches at the bottom are 100% of standard size
                scaleFactor = minScale + (maxScale - minScale) * normalizedPosition;
                
                // Clamp scaleFactor to be between minScale and maxScale, just in case.
                scaleFactor = Math.max(minScale, Math.min(maxScale, scaleFactor));
            }


            const baseLength = (this.height / 5) + Math.random() * (this.height / 4);
            const baseThickness = Math.max(1, this.width / 4);

            const length = baseLength * scaleFactor;
            const thickness = Math.max(1, baseThickness * scaleFactor); // Ensure thickness is at least 1

            this.branches.push(new Branch(this, branchStartX, branchStartY, length, angle, thickness, this.color));
            console.log('Branch added');
        }

        getTotalLeaves() {
            let totalLeaves = this.leaves.length; // Count leaves on trunk (if any are still possible)
            const allBranches = this.getAllBranches();
            allBranches.forEach(branch => {
                totalLeaves += branch.leaves.length;
            });
            return totalLeaves;
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
            this.childBranches = []; // New: List for child branches
            this.endX = this.startX + Math.cos(this.angle) * this.length;
            this.endY = this.startY + Math.sin(this.angle) * this.length;
        }

        drawBranchItself() {
            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(this.endX, this.endY);
            ctx.lineWidth = this.thickness;
            ctx.strokeStyle = this.color;
            ctx.stroke();

            // Recursively draw child branches
            this.childBranches.forEach(child => child.drawBranchItself());
        }

        drawBranchLeaves() {
            this.leaves.forEach(leaf => leaf.draw());
            // Recursively draw leaves of child branches
            this.childBranches.forEach(child => child.drawBranchLeaves());
        }

        addChildBranch() {
            if (this.length < 10 || this.childBranches.length > 2) { // Don't branch if too short or too many children
                console.log("Branch is too short or already has enough child branches.");
                return;
            }

            const newLength = this.length * (0.5 + Math.random() * 0.3); // 50-80% of parent length
            const newThickness = Math.max(1, this.thickness * 0.7); // 70% of parent thickness

            // Angle relative to parent branch, can go downwards
            // e.g. parentAngle +/- 60 degrees (PI/3)
            const angleVariation = Math.PI / 3;
            const newAngle = this.angle + (Math.random() * angleVariation * 2 - angleVariation);

            // New branch starts at the end of the parent branch
            const newBranch = new Branch(this.parentTree, this.endX, this.endY, newLength, newAngle, newThickness, this.color);
            this.childBranches.push(newBranch);
            console.log("Child branch added.");
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
        constructor(startX, startY, length, angle, thickness, depth = 0, maxWidth) { // Added depth and maxWidth
            this.startX = startX;
            this.startY = startY;
            this.length = length;
            this.angle = angle; // Angle in radians (0 is right, PI/2 is down)
            this.thickness = Math.max(1, thickness - depth * 0.5); // Roots get thinner with depth
            this.color = 'peru';
            this.depth = depth; // How many segments away from the main root
            this.childRoots = [];
            this.maxWidth = maxWidth; // Max spread for roots

            this.endX = this.startX + Math.cos(this.angle) * this.length;
            this.endY = this.startY + Math.sin(this.angle) * this.length;

            // Attempt to branch if not too deep and within reasonable y-bounds
            const MAX_ROOT_DEPTH_LEVEL = 4; // Max recursion depth for branching
            const MAX_ROOT_Y_POSITION = canvas.height - 5; // Don't let roots grow off the bottom of the canvas

            if (this.depth < MAX_ROOT_DEPTH_LEVEL && this.endY < MAX_ROOT_Y_POSITION && this.length > 5) {
                // More aggressive branching, similar to tree branches
                 if (Math.random() < 0.6) { // Higher chance to branch
                    this.tryBranch();
                }
                // Chance for a second branch from the same point
                if (this.depth < MAX_ROOT_DEPTH_LEVEL -1 && Math.random() < 0.4) {
                    this.tryBranch();
                }
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
            const MAX_ANGLE_SPREAD = Math.PI / 2.5; // Max angle change from parent, allows wider spread (e.g. +/- 36 degrees from parent)

            // Determine angle variation: ensure roots spread outwards and downwards
            let angleVariation = (Math.random() * MAX_ANGLE_SPREAD) - (MAX_ANGLE_SPREAD / 2);

            // Ensure the new angle is generally downwards
            // Current angle might be anything. We want to bias towards PI/2 (down).
            // If current angle is far from PI/2, nudge it closer.
            let newAngle = this.angle + angleVariation;

            // Nudge towards PI/2 if too horizontal, to encourage downward growth overall
            const downwardBiasStrength = 0.2; // How strongly to pull towards PI/2
            if (Math.abs(newAngle - Math.PI/2) > Math.PI/4) { // If angle is more than 45 deg from straight down
                 newAngle = newAngle * (1 - downwardBiasStrength) + (Math.PI/2) * downwardBiasStrength;
            }


            // Prevent roots from growing too far horizontally beyond maxWidth from the tree's base (this.parentTree.x)
            // This requires access to parentTree.x, which Root doesn't have directly.
            // For now, we'll use a simpler heuristic based on the starting X of the root system (initial call to new Root)
            // This isn't perfect, but avoids complex parent tree reference passing for now.
            // A better approach would be to pass the tree's center X to the constructor.
            // For now, let's assume `this.maxWidth` is the total allowed spread from the initial root point.
            // And `this.startX` of the very first root segment is the center line.
            // This logic is tricky without the tree's actual center.
            // Let's assume the initial call to addRoot will set a sensible initial angle.

            const newLength = this.length * (0.5 + Math.random() * 0.4); // 50-90% of parent length
            if (newLength < 3) return; // Min length for a root segment

            // Check if the new root would go beyond the canvas bottom significantly
            const prospectiveEndY = this.endY + Math.sin(newAngle) * newLength;
            if (prospectiveEndY > canvas.height - 5) { // 5px buffer from bottom
                // console.log("Prevented root from growing off canvas bottom.");
                return;
            }


            this.childRoots.push(new Root(this.endX, this.endY, newLength, newAngle, this.thickness, this.depth + 1, this.maxWidth));
        }
    }


    // UI Elements
    const growHeightButton = document.getElementById('grow-height-button');
    const growRootsButton = document.getElementById('grow-roots-button');
    const growLeavesButton = document.getElementById('grow-leaves-button');
    const addBranchButton = document.getElementById('add-branch-button');
    const produceFruitButton = document.getElementById('produce-fruit-button');
    const plantNewTreeButton = document.getElementById('plant-new-tree-button');
    const scoreDisplay = document.getElementById('current-score');

    // Input fields
    const growHeightInput = document.getElementById('grow-height-input');
    const growRootsInput = document.getElementById('grow-roots-input');
    const growLeavesInput = document.getElementById('grow-leaves-input');
    const addBranchInput = document.getElementById('add-branch-input');
    const produceFruitInput = document.getElementById('produce-fruit-input');

    // Game Setup
    const GROUND_LEVEL_OFFSET = 60; // Pixels from the bottom for the ground - Increased for more root space

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
        if (trees.length === 0) {
            // Disable all buttons if no tree exists
            addBranchButton.disabled = true;
            growLeavesButton.disabled = true;
            produceFruitButton.disabled = true;
            plantNewTreeButton.disabled = true;
            // Keep growHeightButton and growRootsButton enabled or handle separately if needed
            return;
        }

        const currentTree = trees[0]; // Assuming operations are on the first tree

        // Add Branch button
        addBranchButton.disabled = currentTree.height < gameRules.minHeightForBranches;

        // Grow Leaves button
        // Enabled if there's at least one branch.
        growLeavesButton.disabled = currentTree.getAllBranches().length === 0;

        // Produce fruit button
        const canProduceFruit = currentTree.height >= gameRules.minHeightForFruits &&
                                currentTree.getTotalLeaves() >= gameRules.minLeavesForFruits;
        produceFruitButton.disabled = !canProduceFruit;

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
            const inputAmount = parseInt(growHeightInput.value, 10) || 1;
            const growthAmount = inputAmount * 10; // Scale factor of 10
            trees[0].growHeight(growthAmount);
            // Width growth should be relative to the input unit, not the final pixel growth,
            // to maintain the same proportional feel as before.
            // E.g., input 1 (grows 10px) should have same width increase as input 1 before this change.
            trees[0].growWidth(inputAmount * 0.05);
            updateScore();
        }
    });

    growRootsButton.addEventListener('click', () => {
        if (trees.length > 0) {
            const count = parseInt(growRootsInput.value, 10) || 1;
            for (let i = 0; i < count; i++) {
                trees[0].addRoot();
            }
            updateScore();
        }
    });

    growLeavesButton.addEventListener('click', () => {
        if (trees.length > 0) {
            const count = parseInt(growLeavesInput.value, 10) || 1;
            for (let i = 0; i < count; i++) {
                trees[0].addLeaf(10 + Math.random() * 5); // Random leaf size for each
            }
            updateScore();
        }
    });

    produceFruitButton.addEventListener('click', () => {
        if (trees.length > 0) {
            const count = parseInt(produceFruitInput.value, 10) || 1;
            // The produceFruit method will handle incrementing and conditions
            trees[0].produceFruit(count);
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
        if (trees.length === 0) return;
        const currentTree = trees[0]; // For now, always operate on the first tree
        const count = parseInt(addBranchInput.value, 10) || 1;

        for (let i = 0; i < count; i++) {
            // Decide whether to add a branch to the trunk or to an existing branch
            if (currentTree.branches.length === 0 || Math.random() < 0.4 || currentTree.height < gameRules.minHeightForBranches + 20) {
                // Add to trunk if no branches yet, or 40% chance, or if tree is not much taller than min height for branches
                currentTree.addBranch();
            } else {
                // Try to add to an existing branch
                const allBranches = currentTree.getAllBranches(); // Helper function to get all branches including children
                if (allBranches.length > 0) {
                    const randomBranch = allBranches[Math.floor(Math.random() * allBranches.length)];
                    randomBranch.addChildBranch();
                } else {
                    // Fallback if somehow no branches were found (should not happen if currentTree.branches.length > 0)
                    currentTree.addBranch();
                }
            }
        }
        // updateScore(); // Branches might contribute to score later, if desired
    });

    // Helper function in Tree class to get all branches (main + children)
    Tree.prototype.getAllBranches = function() {
        let allBranches = [];
        function collectBranches(branch) {
            allBranches.push(branch);
            branch.childBranches.forEach(collectBranches);
        }
        this.branches.forEach(collectBranches);
        return allBranches;
    };

    // Initialize the game
    initializeGame();
});
