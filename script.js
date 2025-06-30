document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // Game Configuration
    const MAX_TREE_HEIGHT = 1000; // Maximum height a tree can reach

    // Constants for branch number calculation based on height
    const MIN_BRANCHES_AT_MIN_HEIGHT_FOR_BRANCHING = 2;
    const MAX_BRANCHES_AT_MAX_TREE_HEIGHT = 1000;
    const BRANCH_SCALING_EXPONENT = 1.5;

    const gameRules = {
        minHeightForBranches: 100,
        minHeightForFruits: 250,
        minLeavesForFruits: 50,
        minBranchesForLeaves: 1, 
    };

    // Game variables
    let score = 0;
    let trees = [];
    let zoomLevel = 1.0;
    let minZoom = 0.2;
    let maxZoom = 5.0;
    let zoomStep = 0.1;
    let panX = 0; // Renamed from offsetX to avoid conflict with event properties
    let panY = 0; // Renamed from offsetY

    // World Coordinates and Layout Constants
    const WORLD_BACKGROUND_IMAGE_TOP_Y = 0; // Background image starts at Y=0 in world space
    const TREE_BASE_OFFSET_FROM_BG_TOP = 744; // Tree base is 850px below the background image's top
    const WORLD_TREE_BASE_Y = WORLD_BACKGROUND_IMAGE_TOP_Y + TREE_BASE_OFFSET_FROM_BG_TOP; // Tree's Y coordinate

    // Background Image
    const backgroundImage = new Image();
    backgroundImage.src = 'treebg.png'; // Assume treebg.png is in the same directory
    let backgroundImageLoaded = false;

    backgroundImage.onload = () => {
        backgroundImageLoaded = true;
        drawGame(); // Redraw the game once the image is loaded
    };

    backgroundImage.onerror = () => {
        console.error("Error loading background image.");
        // Optionally, handle the error, e.g., by using a fallback background
    };

    // Tree class
    class Tree {
        constructor(x, y, height = 10, width = 5, color = 'saddlebrown', maxWidth = 30) {
            this.x = x;
            this.y = y; // Base of the trunk
            this.height = height;
            this.width = width;
            this.color = color;
            this.maxWidth = maxWidth; // Maximum width the tree can reach
            this.leaves = []; // To store leaf objects - will be deprecated for direct trunk leaves
            this.roots = [];  // To store root objects
            this.branches = []; // To store branch objects
            this.fruits = 0; // Counter for scoring, might be phased out
            this.fruitObjects = []; // To store Fruit objects
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

            // 6. Früchte zeichnen
            this.fruitObjects.forEach(fruit => fruit.draw());
        }

        growHeight(amount = 10) {
            if (this.height >= MAX_TREE_HEIGHT) {
                console.log(`Tree has reached its maximum height of ${MAX_TREE_HEIGHT}px.`);
                return;
            }

            if (this.height + amount > MAX_TREE_HEIGHT) {
                amount = MAX_TREE_HEIGHT - this.height;
                console.log(`Adjusted growth amount to reach maximum height of ${MAX_TREE_HEIGHT}px.`);
            }

            this.height += amount;
            console.log(`Tree height increased to: ${this.height}`);

            // Grow width proportionally to height, up to maxWidth
            // The growth factor for width can be adjusted (e.g., 0.05 means width increases by 5% of height increase)
            const widthIncreaseFactor = 0.05; // Adjust this factor as needed for desired growth rate
            const potentialWidthIncrease = amount * widthIncreaseFactor;

            if (this.width < this.maxWidth) {
                this.width += potentialWidthIncrease;
                if (this.width > this.maxWidth) {
                    this.width = this.maxWidth;
                }
                console.log(`Tree width increased to: ${this.width}`);
            }

            updateScore(); // Score might depend on height and width
        }

        // This method might still be useful for direct width manipulation if needed elsewhere,
        // or can be removed if all width growth is handled by growHeight.
        // For now, let's keep it but ensure it also respects maxWidth.
        growWidth(amount = 2) {
            if (this.width < this.maxWidth) {
                this.width += amount;
                if (this.width > this.maxWidth) {
                    this.width = this.maxWidth;
                }
                console.log(`Tree width increased to: ${this.width}`);
                updateScore(); // Score might depend on width/volume
            } else {
                console.log(`Tree width already at maximum: ${this.maxWidth}`);
            }
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
            const rootStartX = this.x - (this.width / 2) + (Math.random() * this.width);
            const rootStartY = this.y; // Base of the trunk

            // Length and thickness based on tree properties
            const initialLength = (this.height / 15) + Math.random() * 10 + 10; // Adjusted for more substantial initial roots
            const initialThickness = Math.max(2, this.width / 4); // Proportional to trunk width

            // Initial angle: strictly downwards (PI/4 to 3PI/4)
            // Math.PI / 2 is straight down. Variation is Math.PI / 4 on either side.
            const baseAngle = Math.PI / 2;
            const angleDeviation = Math.PI / 2.5; // Max 45 degrees deviation from straight down
            const initialAngle = baseAngle + (Math.random() * angleDeviation * 2 - angleDeviation);

            const newRoot = new Root(this, rootStartX, rootStartY, initialLength, initialAngle, initialThickness, this.color);
            this.roots.push(newRoot);
            console.log(`Primary root added. Angle: ${initialAngle.toFixed(2)}`);

            // Automatically try to add child roots to the new primary root
            // This creates a more developed root system from a single "addRoot" action
            const initialBranchingAttempts = 1 + Math.floor(Math.random() * 2); // Attempt to branch 1 or 2 times
            for (let i = 0; i < initialBranchingAttempts; i++) {
                if (newRoot.length > 10 && newRoot.childRoots.length < 3) { // Check if the new root is substantial enough
                    newRoot.addChildRoot();
                }
            }
            // Second layer of branching for more spread, if the first child roots were successful
            if (newRoot.childRoots.length > 0) {
                newRoot.childRoots.forEach(childRoot => {
                    if (Math.random() < 0.5 && childRoot.length > 10 && childRoot.childRoots.length < 2) {
                        childRoot.addChildRoot();
                    }
                });
            }
        }

        produceFruit(count = 1) { // Add count parameter with default value
            let producedCount = 0;
            const totalLeaves = this.getTotalLeaves();

            if (this.height < gameRules.minHeightForFruits) {
                console.log(`Tree is not tall enough to produce fruit. Min height: ${gameRules.minHeightForFruits}, current: ${this.height}`);
                return;
            }

            if (totalLeaves < gameRules.minLeavesForFruits) {
                console.log(`Tree does not have enough leaves to produce fruit. Min leaves: ${gameRules.minLeavesForFruits}, current: ${totalLeaves}`);
                return;
            }

            const branchesWithLeaves = this.getAllBranches().filter(branch => branch.leaves.length > 0);
            if (branchesWithLeaves.length === 0) {
                console.log("Cannot produce fruit: No branches have leaves.");
                return;
            }

            for (let i = 0; i < count; i++) {
                // Select a random branch that has leaves
                const randomBranchWithLeaves = branchesWithLeaves[Math.floor(Math.random() * branchesWithLeaves.length)];

                // Select a random leaf on that branch to determine the fruit's position
                // Or, for simplicity, place it near the end of the branch or a random position on the branch
                // Similar to how leaves are placed. Let's adapt the leaf placement logic.

                const positionOnBranch = 0.2 + Math.random() * 0.8; // From 20% to 100% along the branch
                const fruitBaseX = randomBranchWithLeaves.startX + Math.cos(randomBranchWithLeaves.angle) * randomBranchWithLeaves.length * positionOnBranch;
                const fruitBaseY = randomBranchWithLeaves.startY + Math.sin(randomBranchWithLeaves.angle) * randomBranchWithLeaves.length * positionOnBranch;

                const fruitSize = 8 + Math.random() * 4; // Fruit size, slightly smaller than average leaves

                // Offset fruit slightly like leaves so they don't all sit directly on the branch line
                const perpendicularOffset = (Math.random() - 0.5) * fruitSize * 2;
                const fruitX = fruitBaseX + Math.sin(randomBranchWithLeaves.angle) * perpendicularOffset;
                const fruitY = fruitBaseY - Math.cos(randomBranchWithLeaves.angle) * perpendicularOffset;

                this.fruitObjects.push(new Fruit(fruitX, fruitY, fruitSize, 'red'));
                this.fruits++; // Keep this counter for now, for score and possibly other logic.
                producedCount++;
            }

            if (producedCount > 0) {
                console.log(`${producedCount} fruit(s) produced. Total fruit objects: ${this.fruitObjects.length}`);
                updateScore(); // Score depends on fruits
            }
        }

        getScore() {
            // Basic score: height + volume (width as proxy) + fruits
            const volumeScore = this.width * this.height / 10; // Example volume calculation
            // Using this.fruitObjects.length for score directly related to visible fruits.
            return Math.round(this.height + volumeScore + (this.fruitObjects.length * 5));
        }

        addBranch() {
            const maxAllowed = calculateMaxAllowedBranches(
                this.height,
                gameRules.minHeightForBranches,
                MAX_TREE_HEIGHT,
                MIN_BRANCHES_AT_MIN_HEIGHT_FOR_BRANCHING,
                MAX_BRANCHES_AT_MAX_TREE_HEIGHT,
                BRANCH_SCALING_EXPONENT
            );

            if (this.getAllBranches().length >= maxAllowed) {
                console.log(`Cannot add trunk branch: maximum ${maxAllowed} branches for current height ${this.height} reached. Current branches: ${this.getAllBranches().length}`);
                return;
            }

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

    class Fruit {
        constructor(x, y, size, color = 'red') {
            this.x = x;
            this.y = y;
            this.size = size;
            this.color = color;
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
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
            const maxAllowedOnTree = calculateMaxAllowedBranches(
                this.parentTree.height,
                gameRules.minHeightForBranches,
                MAX_TREE_HEIGHT,
                MIN_BRANCHES_AT_MIN_HEIGHT_FOR_BRANCHING,
                MAX_BRANCHES_AT_MAX_TREE_HEIGHT,
                BRANCH_SCALING_EXPONENT
            );

            if (this.parentTree.getAllBranches().length >= maxAllowedOnTree) {
                console.log(`Cannot add child branch: maximum ${maxAllowedOnTree} branches for current tree height ${this.parentTree.height} reached. Current branches on tree: ${this.parentTree.getAllBranches().length}`);
                return;
            }

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
        constructor(parentTree, startX, startY, length, angle, thickness, color = 'peru') {
            this.parentTree = parentTree; // Reference to the tree, similar to Branch
            this.startX = startX;
            this.startY = startY;
            this.length = length;
            this.angle = angle; // Angle in radians (0 is right, PI/2 is down)
            this.thickness = Math.max(1, thickness); // Ensure thickness is at least 1
            this.color = parentTree ? parentTree.color : color; // Inherit color or use default
            this.childRoots = [];

            this.endX = this.startX + Math.cos(this.angle) * this.length;
            this.endY = this.startY + Math.sin(this.angle) * this.length;

            // Automatic branching logic will be moved to a separate method, e.g., addChildRoot
            // and called from Tree.addRoot or explicitly by a game action.
            // For now, the constructor just creates the root segment.
        }

        draw() {
            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(this.endX, this.endY);
            ctx.lineWidth = this.thickness;
            // Use the root's own color, which might be different from the trunk if desired.
            // For now, let's use a distinct root color.
            ctx.strokeStyle = 'peru'; // Or this.color if we want to allow varied root colors
            ctx.stroke();

            this.childRoots.forEach(child => child.draw());
        }

        // This method will be adapted from the old tryBranch and current Branch.addChildBranch
        addChildRoot() {
            // Basic conditions to prevent overly dense or tiny roots
            if (this.length < 8 || this.childRoots.length > 2) { // Max 2 child roots per segment, min length 8
                // console.log("Root segment is too short or already has enough child roots.");
                return;
            }

            const newLength = this.length * (0.5 + Math.random() * 0.4); // 50-90% of parent length
            const newThickness = Math.max(1, this.thickness * 0.8); // 80% of parent thickness, min 1

            let newAngle;
            let attempts = 0;
            const maxAttempts = 10; // Prevent infinite loop if angle generation is stuck

            do {
                // Angle relative to parent branch, can go downwards or sideways
                // Max deviation of, say, 60 degrees (PI/3) from parent's angle initially
                const angleVariation = (Math.PI / 2.5) * (Math.random() - 0.5); // Varies by +/- 36 degrees from parent
                newAngle = this.angle + angleVariation;

                // Normalize angle to the range [-PI, PI] for consistent checks
                // (angle + PI) % (2 * PI) - PI normalizes to [-PI, PI]
                newAngle = (newAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI; // Ensure positive before modulo, then shift

                // Constraint: Child roots can grow in any direction except sharply upwards.
                // "Sharply upwards" means not more than 45 degrees from horizontal, towards the sky.
                // Sky is generally angles from 0 (exclusive) to -PI (exclusive).
                // -PI/2 is straight up.
                // Forbidden zone: angles between -PI/4 (i.e., -45 deg) and -3*PI/4 (i.e., -135 deg).
                // This is an upward cone of 90 degrees, centered on straight up.
                const forbiddenMin = - (3 * Math.PI / 4); // -135 degrees
                const forbiddenMax = - (Math.PI / 4);     // -45 degrees

                if (newAngle > forbiddenMin && newAngle < forbiddenMax) {
                    // Angle is in the forbidden "sharply upward" zone.
                    // Adjust it to be more horizontal or downward.
                    // Example: if it's pointing up-left, nudge it to left-horizontal or more down.
                    // if it's pointing up-right, nudge to right-horizontal or more down.
                    if (newAngle < -Math.PI / 2) { // Between -135 and -90 (up-left quadrant)
                        // Push towards left horizontal (-PI) or downwards (PI/2)
                        newAngle = -Math.PI + (Math.random() * Math.PI / 4); // Bias towards left horizontal
                    } else { // Between -90 and -45 (up-right quadrant)
                        // Push towards right horizontal (0) or downwards (PI/2)
                        newAngle = 0 - (Math.random() * Math.PI / 4); // Bias towards right horizontal
                    }
                    // console.log(`Adjusted angle from forbidden zone to ${newAngle.toFixed(2)}`);
                }
                attempts++;
            } while ((newAngle > (-3 * Math.PI / 4) && newAngle < (-Math.PI / 4)) && attempts < maxAttempts);

            if (attempts >= maxAttempts) {
                // console.log("Could not find a suitable angle for child root after max attempts.");
                return;
            }

            // Calculate prospective end Y
            let prospectiveEndY = this.endY + Math.sin(newAngle) * newLength;

            // Constraint: Roots should not go above the tree's starting point (this.parentTree.y)
            if (prospectiveEndY < this.parentTree.y) {
                // If the root is trying to grow above the tree base,
                // try to adjust angle to be horizontal or slightly downwards.
                // If this.endY is already at parentTree.y, it can only go horizontal or down.

                // If endY is very close to or above parentTree.y, only allow horizontal or downward angles.
                if (this.endY <= this.parentTree.y + 2) { // Small tolerance
                    if (newAngle < 0 && newAngle > -Math.PI) { // If angle is generally upwards
                        // Try to make it horizontal.
                        // Determine if it was going left or right.
                        if (newAngle > -Math.PI / 2) { // Up-right quadrant
                            newAngle = 0; // Go right
                        } else { // Up-left quadrant
                            newAngle = Math.PI; // Go left
                        }
                        // Recalculate prospectiveEndY with the new horizontal angle
                        prospectiveEndY = this.endY + Math.sin(newAngle) * newLength;
                        // If it's still above (e.g. due to floating point issues or if sin(0) or sin(PI) isn't exactly 0 for the engine)
                        // or if the startY itself was already slightly above, then just don't create this root.
                        if (prospectiveEndY < this.parentTree.y) {
                             // console.log(`Child root aborted: Adjusted horizontal angle still results in growth above tree base. StartY: ${this.endY}, TreeBase: ${this.parentTree.y}`);
                            return;
                        }
                    }
                } else {
                    // If it's further below, but still trying to go up too high,
                    // simply disallow this specific branch.
                    // console.log(`Child root aborted: ProspectiveEndY ${prospectiveEndY} is above tree base ${this.parentTree.y}.`);
                    return;
                }
            }

            // Check if the new root would go beyond the canvas bottom significantly
            if (prospectiveEndY > canvas.height - 2) { // 2px buffer from bottom
                // console.log(`Child root prospective EndY ${prospectiveEndY} is off canvas. Aborting.`);
                return;
            }

            if (newLength < 2) { // Minimum length for a root segment
                // console.log("Child root new length is too small. Aborting.");
                return;
            }

            const newRoot = new Root(this.parentTree, this.endX, this.endY, newLength, newAngle, newThickness, this.color);
            this.childRoots.push(newRoot);
            // console.log(`Child root added. Angle: ${newAngle.toFixed(2)}`);

            // Chance for the new child root to also try and branch further
            // Reduced probability and check childBranches.length to avoid too dense structures quickly.
            if (Math.random() < 0.4 && newRoot.childRoots.length < 2 && newRoot.length > 5) {
                newRoot.addChildRoot();
            }
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
    // const zoomInButton = document.getElementById('zoom-in-button'); // Removed
    // const zoomOutButton = document.getElementById('zoom-out-button'); // Removed

    // Input fields
    const growHeightInput = document.getElementById('grow-height-input');
    const growRootsInput = document.getElementById('grow-roots-input');

    // Utility function to calculate maximum allowed branches based on tree height
    function calculateMaxAllowedBranches(height, minHeightForBranches, maxHeight, minBranches, maxBranches, exponent) {
        if (height < minHeightForBranches) {
            return 0;
        }
        if (height >= maxHeight) {
            return maxBranches;
        }

        const effectiveHeight = height - minHeightForBranches;
        const totalEffectiveHeightRange = maxHeight - minHeightForBranches;

        if (totalEffectiveHeightRange <= 0) {
            // This case implies minHeightForBranches >= maxHeight, so effectively only minBranches apply if height condition met.
            return minBranches;
        }

        const heightRatio = effectiveHeight / totalEffectiveHeightRange;
        const additionalBranches = (maxBranches - minBranches) * Math.pow(heightRatio, exponent);

        return Math.floor(minBranches + additionalBranches);
    }

    const growLeavesInput = document.getElementById('grow-leaves-input');
    const addBranchInput = document.getElementById('add-branch-input');
    const produceFruitInput = document.getElementById('produce-fruit-input');

    // Game Setup
    // const GROUND_LEVEL_OFFSET = 210; // This is effectively replaced by WORLD_TREE_BASE_Y logic

    function initializeGame() {
        resizeCanvas(); // Call resizeCanvas first to set correct canvas dimensions

        // Create the first tree
        if (trees.length === 0) {
            const initialTreeX = canvas.width / 2; // X can still be canvas-relative for initial placement
            const initialTreeY = WORLD_TREE_BASE_Y; // Use the new world coordinate
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
            growHeightButton.disabled = true; // Also disable grow height if no tree
            addBranchButton.disabled = true;
            growLeavesButton.disabled = true;
            produceFruitButton.disabled = true;
            plantNewTreeButton.disabled = true;
            // Keep growRootsButton enabled or handle if it should also be disabled
            return;
        }

        const currentTree = trees[0]; // Assuming operations are on the first tree

        // Grow Height button
        growHeightButton.disabled = currentTree.height >= MAX_TREE_HEIGHT;

        // Add Branch button
        const maxAllowedBranches = calculateMaxAllowedBranches(
            currentTree.height,
            gameRules.minHeightForBranches,
            MAX_TREE_HEIGHT,
            MIN_BRANCHES_AT_MIN_HEIGHT_FOR_BRANCHING,
            MAX_BRANCHES_AT_MAX_TREE_HEIGHT,
            BRANCH_SCALING_EXPONENT
        );
        const currentBranches = currentTree.getAllBranches().length;
        addBranchButton.disabled = currentTree.height < gameRules.minHeightForBranches || currentBranches >= maxAllowedBranches;

        // Grow Leaves button
        // Enabled if there's at least one branch.
        growLeavesButton.disabled = currentTree.getAllBranches().length === 0;

        // Produce fruit button
        const canProduceFruit = currentTree.height >= gameRules.minHeightForFruits &&
            currentTree.getTotalLeaves() >= gameRules.minLeavesForFruits;                    
        produceFruitButton.disabled = !canProduceFruit;
		

        // Plant new tree button
        if (trees.some(tree => tree.fruitObjects.length > 0)) {
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
        // Clear canvas (before transformations)
        ctx.save(); // Save the default state
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to identity
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore(); // Restore to whatever state it was (should be default)

        // Apply pan and zoom transformations for the entire game world
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoomLevel, zoomLevel);

        // --- Background Drawing Starts ---
        if (backgroundImageLoaded) {
            const imgWidth = backgroundImage.naturalWidth;
            const imgHeight = backgroundImage.naturalHeight;

            // Calculate the visible portion of the world in world coordinates
            const viewX = -panX / zoomLevel;
            const viewY = -panY / zoomLevel;
            const viewWidth = canvas.width / zoomLevel;
            const viewHeight = canvas.height / zoomLevel;

            // --- 1. Draw Background Colors ---
            // Top color (#4ab2e9)
            ctx.fillStyle = '#4ab2e9';
            ctx.fillRect(viewX, viewY, viewWidth, viewHeight);

            // --- 2. Draw Tiled Background Image ---
            // The image should be placed towards the "bottom" of the sky.
            // Let's assume the image's bottom edge aligns with where the "ground color" begins.
            // For now, let ground color start where tree roots typically are, or slightly above.
            // The groundY for drawing the actual ground line is: canvas.height - GROUND_LEVEL_OFFSET + 2
            // This groundY is in screen coordinates before zoom/pan.
            // We need to define a "horizon" or "image bottom" in world coordinates.
            // Let's place the bottom of the image at a Y coordinate that corresponds to the visual ground.
            // The ground line is drawn at `canvas.height - GROUND_LEVEL_OFFSET + 2` (screen space)
            // World Y for image bottom:
            // const imageBottomY = (canvas.height - GROUND_LEVEL_OFFSET) / zoomLevel - viewY; // OLD
            // const worldImageBottomY = (canvas.height - GROUND_LEVEL_OFFSET); // OLD

            // Let's try to fix the image's bottom relative to the game's ground level.
            // The game's ground level is effectively `canvas.height - GROUND_LEVEL_OFFSET` in screen space.
            // In world space, this means `( (canvas.height - GROUND_LEVEL_OFFSET) - panY ) / zoomLevel`.
            // This is where the visual ground line is. We want the image to sit on this.
            // const imageWorldY = (canvas.height - GROUND_LEVEL_OFFSET - imgHeight * zoomLevel - panY) / zoomLevel; // OLD
                                //This calculation is getting complex due to mapping screen space to world space.
                                //Let's simplify: define the image's bottom Y in world units first.
                                //The trees are planted at `initialTreeY = canvas.height - GROUND_LEVEL_OFFSET`.
                                //So, this `initialTreeY` can be our reference world Y for the ground.
                                //The image should sit on this line.
            // const imageBaseWorldY = (canvas.height - GROUND_LEVEL_OFFSET); // OLD - Base Y for trees in screen space, effectively world 0 for tree base
            const imageTopToDrawAt = WORLD_BACKGROUND_IMAGE_TOP_Y; // NEW - Background image starts at this world Y


            // Tiling logic:
            // Start drawing from the left edge of the view, ensuring pattern alignment
            const startX = Math.floor(viewX / imgWidth) * imgWidth;
            const endX = viewX + viewWidth;

            for (let x = startX; x < endX; x += imgWidth) {
                // We need to draw the image such that its bottom edge is at `imageBaseWorldY`.
                // The `drawImage` y-coordinate is the top-left of the image.
                // So, y = imageBaseWorldY - imgHeight (in world coordinates)
                ctx.drawImage(backgroundImage, x, imageTopToDrawAt, imgWidth, imgHeight);
            }

            // --- 3. Draw Bottom Background Color ---
            // This color fills the area below the image (or below the tree base).
            ctx.fillStyle = '#6eb23e';
            // The fill should start from where the tree base is (or image bottom) and go downwards.
            const groundColorStartY = WORLD_BACKGROUND_IMAGE_TOP_Y + imgHeight; // Bottom of the background image
            // It should fill from groundColorStartY to the bottom of the view.
            ctx.fillRect(viewX, groundColorStartY, viewWidth, viewHeight - (groundColorStartY - viewY) );


        } else {
            // Fallback if image not loaded: fill with a default sky color
            ctx.fillStyle = '#4ab2e9'; // Default sky
            ctx.fillRect(-panX / zoomLevel, -panY / zoomLevel, canvas.width / zoomLevel, canvas.height / zoomLevel);
            ctx.fillStyle = '#6eb23e'; // Default ground
            // Fallback ground starts at WORLD_TREE_BASE_Y if image fails to load
            const groundStartWorldY = WORLD_TREE_BASE_Y;
            ctx.fillRect(-panX / zoomLevel, groundStartWorldY, canvas.width / zoomLevel, (canvas.height / zoomLevel) - groundStartWorldY + (-panY / zoomLevel) );
        }
        // --- Background Drawing Ends ---


        // Draw ground (simple line) - Optional: if you want a line at the tree base
        // This should be drawn on top of the background colors/image.
        // ctx.strokeStyle = 'SaddleBrown';
        // ctx.lineWidth = 4; // Adjusted for world coordinates (zoom will scale it)
        // ctx.beginPath();
        // const groundLineY = WORLD_TREE_BASE_Y; // Tree base is the new ground line
        // We need to draw this line across the entire visible world width.
        // ctx.moveTo(-panX / zoomLevel, groundLineY);
        // ctx.lineTo((-panX + canvas.width) / zoomLevel, groundLineY);
        // ctx.stroke(); // Ground line removed as per request, but logic retained if needed


        // Update and draw game objects (trees, etc.)
        trees.forEach(tree => tree.draw());

        ctx.restore(); // Restore to pre-zoom/pan state (identity transform)
    }

    // Event Listeners for UI
    growHeightButton.addEventListener('click', () => {
        if (trees.length > 0) {
            const inputAmount = parseInt(growHeightInput.value, 10) || 1;
            const growthAmount = inputAmount * 10; // Scale factor of 10
            trees[0].growHeight(growthAmount); // growHeight now handles width increase
            // The old growWidth call is removed: trees[0].growWidth(inputAmount * 0.05);
            updateScore(); // updateScore is already called within growHeight, but calling again here ensures UI consistency if growHeight's call is removed later.
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
        const parentTree = trees.find(tree => tree.fruitObjects.length > 0);
        if (parentTree) {
            parentTree.fruitObjects.pop(); // Remove one fruit object
            parentTree.fruits = parentTree.fruitObjects.length; // Update the counter if still used elsewhere

            const newX = Math.random() * (canvas.width - 60) + 30; // Random X, away from edges
            const newY = WORLD_TREE_BASE_Y; // Base of the trunk using the world coordinate

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
        updateScore(); // Branches might contribute to score later, if desired
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

    // Basic Panning with Mouse (Optional - for better UX with zoom)
    let isPanning = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    canvas.addEventListener('mousedown', (e) => {
        // Check if the click is on the canvas itself, not UI elements if they were overlaid
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            panX += dx;
            panY += dy;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            // drawGame(); // Redraw is implicitly handled by gameLoop
        }
    });

    canvas.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'grab';
        }
    });

    canvas.addEventListener('mouseleave', () => { // Stop panning if mouse leaves canvas
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'default'; // Or 'grab' if you want to indicate it's grabbable
        }
    });

    // Add grab cursor initially
    canvas.style.cursor = 'grab';

    // Touch event variables
    let initialPinchDistance = null;
    let lastPanX = panX; // To store panX before pinch zoom for correct offsetting
    let lastPanY = panY; // To store panY before pinch zoom for correct offsetting


    // Wheel to zoom (Optional - for better UX)
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault(); // Prevent page scrolling

        const rect = canvas.getBoundingClientRect();
        // Mouse position relative to canvas top-left
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // World coordinates before zoom
        const worldXBeforeZoom = (mouseX - panX) / zoomLevel;
        const worldYBeforeZoom = (mouseY - panY) / zoomLevel;

        if (e.deltaY < 0) { // Zoom in
            zoomLevel = Math.min(maxZoom, zoomLevel + zoomStep);
        } else { // Zoom out
            zoomLevel = Math.max(minZoom, zoomLevel - zoomStep);
        }

        // After zoom, adjust panX and panY to keep the point under the mouse stationary
        panX = mouseX - worldXBeforeZoom * zoomLevel;
        panY = mouseY - worldYBeforeZoom * zoomLevel;

        // drawGame(); // Redraw is implicitly handled by gameLoop
    }, { passive: false }); // passive: false to allow preventDefault


    // Touch Event Handlers for Pinch-to-Zoom and Swipe-to-Pan

    function getDistance(p1, p2) {
        return Math.sqrt(Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2));
    }

    function getMidpoint(p1, p2) {
        return {
            x: (p1.clientX + p2.clientX) / 2,
            y: (p1.clientY + p2.clientY) / 2,
        };
    }

    let lastTouchX = 0;
    let lastTouchY = 0;
    let isTouching = false; // For single touch panning

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touches = e.touches;
        if (touches.length === 2) {
            // Pinch-to-zoom
            initialPinchDistance = getDistance(touches[0], touches[1]);
            // Store current pan values to correctly offset during zoom
            lastPanX = panX;
            lastPanY = panY;
            isPanning = false; // Disable mouse panning during pinch
            isTouching = false; // Disable single touch panning
        } else if (touches.length === 1) {
            // Single touch for panning
            isPanning = false; // Disable mouse panning
            isTouching = true;
            lastTouchX = touches[0].clientX;
            lastTouchY = touches[0].clientY;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touches = e.touches;
        if (touches.length === 2 && initialPinchDistance !== null) {
            // Pinch-to-zoom
            const currentPinchDistance = getDistance(touches[0], touches[1]);
            const zoomFactor = currentPinchDistance / initialPinchDistance;
            const newZoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel * zoomFactor));

            // Calculate midpoint of current touches relative to canvas
            const rect = canvas.getBoundingClientRect();
            const midPoint = getMidpoint(touches[0], touches[1]);
            const mouseX = midPoint.x - rect.left;
            const mouseY = midPoint.y - rect.top;

            // Calculate world coordinates of midpoint before zoom
            // Important: use the panX/panY from *before* this pinch operation started
            const worldXBeforeZoom = (mouseX - lastPanX) / zoomLevel;
            const worldYBeforeZoom = (mouseY - lastPanY) / zoomLevel;

            zoomLevel = newZoomLevel; // Apply the new zoom level

            // Adjust panX and panY to keep the point under the midpoint stationary
            panX = mouseX - worldXBeforeZoom * zoomLevel;
            panY = mouseY - worldYBeforeZoom * zoomLevel;

            initialPinchDistance = currentPinchDistance; // Update for next move event
             // Update lastPanX/Y for continuous pinch without lifting fingers
            lastPanX = panX;
            lastPanY = panY;


        } else if (touches.length === 1 && isTouching) {
            // Single touch for panning
            const touch = touches[0];
            const dx = touch.clientX - lastTouchX;
            const dy = touch.clientY - lastTouchY;
            panX += dx;
            panY += dy;
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (e.touches.length < 2) {
            initialPinchDistance = null; // Reset pinch distance
        }
        if (e.touches.length < 1) {
            isTouching = false; // Reset single touch panning
        }
        // Re-enable mouse panning if no touches are active.
        // The existing mouseup/mouseleave handlers for mouse panning should correctly set isPanning.
        // If there are still touches, one of the touch handlers will set isPanning or isTouching.
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        initialPinchDistance = null;
        isTouching = false;
    }, { passive: false });

});