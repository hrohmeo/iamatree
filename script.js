const CLICK_PADDING = 10; // Padding for tree click area

document.addEventListener('DOMContentLoaded', () => {
	
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    // --- Tree Configurations ---
    const defaultTreeConfig = {
        name: "DefaultTree",
        maxHeight: 1000,
        maxWidth: 30, // Maximum width the tree trunk can reach
        colors: {
            trunk: 'saddlebrown',
            leaf: 'green', // Default leaf color for addLeaf on Tree, if branch has no leaves yet.
            fruit: 'red',
            root: 'peru',
        },
        // Angles in radians. 0 is right, -PI/2 is up, PI/2 is down, PI is left.
        angles: {
            // For branches from trunk:
            // Assuming onLeft: -PI/2 - Math.random() * (PI/2)  => [-PI, -PI/2] (upper-left quadrant)
            // Assuming onRight: -Math.random() * (PI/2) => [-PI/2, 0] (upper-right quadrant)
            // We can define a general upward range, e.g., -PI to 0, and let logic pick left/right.
            branchInitialMin: -Math.PI, // Roughly -180 deg
            branchInitialMax: 0,          // Roughly 0 deg (straight right)
                                          // Specific logic in addBranch further refines this to be upward pointing.

            // For child branches (relative to parent branch angle):
            // angleVariation = Math.PI / 3; newAngle = parent.angle + (Math.random() * angleVariation * 2 - angleVariation);
            branchSubsequentVariation: Math.PI / 3, // +/- 60 degrees from parent angle

            // For roots from trunk:
            // baseAngle = Math.PI / 2 (down); angleDeviation = Math.PI / 2.5; initialAngle = baseAngle +/- angleDeviation
            rootInitialBase: Math.PI / 2,
            rootInitialVariation: Math.PI / 2.5, // Max 72 degrees deviation from straight down

            // For child roots (relative to parent root angle):
            // angleVariation = (Math.PI / 2.5) * (Math.random() - 0.5); newAngle = parent.angle + angleVariation
            rootSubsequentVariation: Math.PI / 2.5, // +/- 36 degrees from parent angle
        },
        // Example for fir/spruce like downward branches for RIGHT side (mirrored for left):
        // branchInitialMin: Math.PI / 12, // 15 degrees down
        // branchInitialMax: Math.PI / 4,  // 45 degrees down
        // branchSubsequentVariation: Math.PI / 6, // +/- 30 degrees
        rules: {
            minHeightForBranches: 100,
            minHeightForFruits: 250,
            minLeavesForFruits: 50,
            minBranchesForLeaves: 1, // If we decide to use this for anything specific
        },
        branchParams: {
            minBranchesAtMinHeight: 2, // Min branches once minHeightForBranches is reached
            maxBranchesAtMaxHeight: 1000, // Max branches at tree's maxHeight
            scalingExponent: 1.5,
        },
        fruitSize: { // Example values
            min: 8,
            max: 35,
        },
        minSizeForNewTree: 25,
        leafSize: { // Example values for leaves added via tree.addLeaf()
            min: 16, // Doubled from 8
            max: 30, // Doubled from 15
        },
        // Determines how much the trunk width increases per unit of height increase
        trunkWidthGrowthFactor: 0.05,
        // Max number of child branches a single branch can have
        maxChildBranchesPerBranch: 2,
        // Min length for a branch to be able to sprout child branches
        minBranchLengthForSubBranching: 10,
        // Root branching properties
        maxChildRootsPerRoot: 2,
        minRootLengthForSubRooting: 8,
        // Leaf placement on branch (from 20% to 100% along branch)
        leafPlacementRange: { min: 0.2, max: 1.0 },
        // Fruit placement on branch
        fruitPlacementRange: { min: 0.2, max: 0.8 },
        leafOutStartMonth: 2, // March (0-indexed)
        leafOutEndMonth: 5,   // June
    };

    const willowLikeConfig = {
        name: "WillowLike",
        maxHeight: 800,
        maxWidth: 25,
        colors: {
            trunk: '#8B4513', // Darker brown
            leaf: 'darkolivegreen',
            fruit: 'lightcoral',
            root: '#A0522D', // Sienna
        },
        angles: {
            // Willow branches tend to droop more
            branchInitialMin: -Math.PI * 0.75, // More towards horizontal or slightly down
            branchInitialMax: -Math.PI * 0.25,
            branchSubsequentVariation: Math.PI / 2, // Wider variation, allowing more droop

            rootInitialBase: Math.PI / 2,
            rootInitialVariation: Math.PI / 2, // Wider spread for roots
            rootSubsequentVariation: Math.PI / 2,
        },
        rules: {
            minHeightForBranches: 80,
            minHeightForFruits: 200,
            minLeavesForFruits: 60,
            minBranchesForLeaves: 1,
        },
        branchParams: {
            minBranchesAtMinHeight: 3,
            maxBranchesAtMaxHeight: 1200, // Potentially more, thinner branches
            scalingExponent: 1.6,
        },
        fruitSize: {
            min: 6,
            max: 10,
        },
        minSizeForNewTree: 9,
        leafSize: {
            min: 20, // Doubled from 10
            max: 36, // Doubled from 18
        },
        trunkWidthGrowthFactor: 0.04,
        maxChildBranchesPerBranch: 3, // More branching
        minBranchLengthForSubBranching: 8,
        maxChildRootsPerRoot: 3,
        minRootLengthForSubRooting: 6,
        leafPlacementRange: { min: 0.1, max: 1.0 },
        fruitPlacementRange: { min: 0.1, max: 0.9 },
        leafOutStartMonth: 3, // April
        leafOutEndMonth: 6,   // July
    };

    // Array of available configurations
    const availableTreeConfigs = [defaultTreeConfig, willowLikeConfig];
    let currentConfigIndex = 0; // To cycle through configs when planting new trees

    // --- Start of New Tree Configurations ---

    // Uncommon Trees
    const oakConfig = {
        name: "Oak",
        maxHeight: 900,
        maxWidth: 35,
        colors: {
            trunk: '#654321', // Darker, rugged brown
            leaf: '#556B2F', // Dark olive green
            fruit: '#8B4513', // Acorn color (saddle brown)
            root: '#5C4033', // Darker brown for roots
        },
        angles: { ...defaultTreeConfig.angles, branchInitialMin: -Math.PI * 0.8, branchInitialMax: -Math.PI * 0.2 },
        rules: { ...defaultTreeConfig.rules, minHeightForBranches: 90, minHeightForFruits: 220 },
        branchParams: { ...defaultTreeConfig.branchParams, maxBranchesAtMaxHeight: 1100, scalingExponent: 1.4 },
        fruitSize: { min: 5, max: 8 }, // Acorns
        minSizeForNewTree: 7,
        leafSize: { min: 18, max: 32 },
        trunkWidthGrowthFactor: 0.055,
        maxChildBranchesPerBranch: 2,
        minBranchLengthForSubBranching: 12,
        maxChildRootsPerRoot: 2,
        minRootLengthForSubRooting: 9,
        leafPlacementRange: { min: 0.15, max: 0.95 },
        fruitPlacementRange: { min: 0.2, max: 0.8 },
        leafOutStartMonth: 2, // March
        leafOutEndMonth: 5,   // June
    };

    const beechConfig = {
        name: "Beech",
        maxHeight: 850,
        maxWidth: 30,
        colors: {
            trunk: '#A9A9A9', // Smooth, greyish bark
            leaf: '#3CB371', // Medium sea green
            fruit: '#D2691E', // Beechnut color (chocolate)
            root: '#808080', // Grey for roots
        },
        angles: { ...defaultTreeConfig.angles, branchSubsequentVariation: Math.PI / 2.5 },
        rules: { ...defaultTreeConfig.rules, minHeightForBranches: 95, minLeavesForFruits: 55 },
        branchParams: { ...defaultTreeConfig.branchParams, maxBranchesAtMaxHeight: 1000, scalingExponent: 1.55 },
        fruitSize: { min: 4, max: 7 }, // Beechnuts
        minSizeForNewTree: 6,
        leafSize: { min: 17, max: 30 },
        trunkWidthGrowthFactor: 0.045,
        maxChildBranchesPerBranch: 2,
        minBranchLengthForSubBranching: 10,
        maxChildRootsPerRoot: 3,
        minRootLengthForSubRooting: 7,
        leafPlacementRange: { min: 0.2, max: 1.0 },
        fruitPlacementRange: { min: 0.25, max: 0.85 },
        leafOutStartMonth: 3, // April
        leafOutEndMonth: 6,   // July
    };

    const mapleConfig = {
        name: "Maple",
        maxHeight: 750,
        maxWidth: 28,
        colors: {
            trunk: '#BC8F8F', // Rosy brown
            leaf: '#FF6347', // Tomato red (autumn color, could vary)
            fruit: '#CD853F', // Samara color (peru)
            root: '#A0522D', // Sienna
        },
        angles: { ...defaultTreeConfig.angles, branchInitialMin: -Math.PI * 0.9, branchInitialMax: -Math.PI * 0.1 },
        rules: { ...defaultTreeConfig.rules, minHeightForFruits: 230 },
        branchParams: { ...defaultTreeConfig.branchParams, minBranchesAtMinHeight: 3, maxBranchesAtMaxHeight: 1300, scalingExponent: 1.6 },
        fruitSize: { min: 10, max: 15 }, // Samaras (helicopter seeds) - representing size of the wing pair
        minSizeForNewTree: 14,
        leafSize: { min: 20, max: 38 }, // Larger, distinct leaves
        trunkWidthGrowthFactor: 0.05,
        maxChildBranchesPerBranch: 3,
        minBranchLengthForSubBranching: 9,
        maxChildRootsPerRoot: 2,
        minRootLengthForSubRooting: 8,
        leafPlacementRange: { min: 0.1, max: 0.9 },
        fruitPlacementRange: { min: 0.15, max: 0.8 },
        leafOutStartMonth: 2, // March
        leafOutEndMonth: 5,   // June
    };

    // Rare Trees
    const firConfig = {
        name: "Fir",
        maxHeight: 1200,
        maxWidth: 25, // Typically slender
        colors: {
            trunk: '#708090', // Slate gray
            leaf: '#006400', // Dark green (needles)
            fruit: '#8B4513', // Cone color (saddle brown)
            root: '#556B2F', // Dark olive green for roots
        },
        angles: { ...defaultTreeConfig.angles, branchInitialMin: Math.PI / 12, branchInitialMax: Math.PI / 4, branchSubsequentVariation: Math.PI / 6 }, // Branches point slightly downwards
        rules: { ...defaultTreeConfig.rules, minHeightForBranches: 70, minHeightForFruits: 300 },
        branchParams: { ...defaultTreeConfig.branchParams, maxBranchesAtMaxHeight: 800, scalingExponent: 1.3 },
        fruitSize: { min: 10, max: 18 }, // Cones
        minSizeForNewTree: 17,
        leafSize: { min: 12, max: 22 }, // Representing clusters of needles
        trunkWidthGrowthFactor: 0.035,
        maxChildBranchesPerBranch: 2,
        minBranchLengthForSubBranching: 15, // Longer main branches before sub-branching
        maxChildRootsPerRoot: 2,
        minRootLengthForSubRooting: 10,
        leafPlacementRange: { min: 0.05, max: 1.0 }, // Needles cover more of the branch
        fruitPlacementRange: { min: 0.5, max: 0.9 }, // Cones often near ends or upper parts
        leafOutStartMonth: 0, // Evergreen - can "grow" leaves year-round conceptually
        leafOutEndMonth: 11,
    };

    const pineConfig = {
        name: "Pine",
        maxHeight: 1100,
        maxWidth: 28,
        colors: {
            trunk: '#8B7355', // Rosy brown, slightly lighter than oak
            leaf: '#228B22', // Forest green (needles)
            fruit: '#A0522D', // Cone color (sienna)
            root: '#6B4226', // Darker brown
        },
        angles: { ...defaultTreeConfig.angles, branchInitialMin: -Math.PI * 0.7, branchInitialMax: -Math.PI * 0.3, branchSubsequentVariation: Math.PI / 3.5 },
        rules: { ...defaultTreeConfig.rules, minHeightForBranches: 75, minLeavesForFruits: 70 },
        branchParams: { ...defaultTreeConfig.branchParams, maxBranchesAtMaxHeight: 900, scalingExponent: 1.35 },
        fruitSize: { min: 8, max: 15 }, // Cones
        minSizeForNewTree: 14,
        leafSize: { min: 14, max: 25 }, // Needles
        trunkWidthGrowthFactor: 0.04,
        maxChildBranchesPerBranch: 2,
        minBranchLengthForSubBranching: 14,
        maxChildRootsPerRoot: 2,
        minRootLengthForSubRooting: 9,
        leafPlacementRange: { min: 0.1, max: 1.0 },
        fruitPlacementRange: { min: 0.4, max: 0.85 },
        leafOutStartMonth: 0, // Evergreen
        leafOutEndMonth: 11,
    };

    const spruceConfig = {
        name: "Spruce",
        maxHeight: 1300, // Can get very tall
        maxWidth: 22, // Slender, conical shape
        colors: {
            trunk: '#696969', // Dim gray, sometimes scaly
            leaf: '#008080', // Teal (bluish-green needles)
            fruit: '#D2B48C', // Cone color (tan)
            root: '#4A3B31', // Dark, earthy brown
        },
        angles: { ...defaultTreeConfig.angles, branchInitialMin: 0, branchInitialMax: Math.PI / 6, branchSubsequentVariation: Math.PI / 5 }, // Branches now configured to be slightly downturned
        rules: { ...defaultTreeConfig.rules, minHeightForBranches: 60, minHeightForFruits: 350 },
        branchParams: { ...defaultTreeConfig.branchParams, maxBranchesAtMaxHeight: 700, scalingExponent: 1.25 }, // Fewer, but well-defined branch whorls
        fruitSize: { min: 12, max: 20 }, // Longer cones
        minSizeForNewTree: 19,
        leafSize: { min: 10, max: 20 }, // Needles
        trunkWidthGrowthFactor: 0.03,
        maxChildBranchesPerBranch: 1, // Less sub-branching to maintain conical shape
        minBranchLengthForSubBranching: 18,
        maxChildRootsPerRoot: 2,
        minRootLengthForSubRooting: 12,
        leafPlacementRange: { min: 0.0, max: 1.0 }, // Needles all along
        fruitPlacementRange: { min: 0.6, max: 0.95 }, // Cones hang down, often upper parts
        leafOutStartMonth: 0, // Evergreen
        leafOutEndMonth: 11,
    };

    // Epic Trees
    const mangoConfig = {
        name: "Mango",
        maxHeight: 600, // Broad, dense canopy rather than extreme height
        maxWidth: 40, // Wide trunk
        colors: {
            trunk: '#A0522D', // Sienna, can be darker
            leaf: '#3A5F0B', // Dark, glossy green
            fruit: '#FFBF00', // Amber to orange-red for mangoes
            root: '#8B4513', // Saddle brown
        },
        angles: { ...defaultTreeConfig.angles, branchInitialMin: -Math.PI * 0.85, branchInitialMax: -Math.PI * 0.15, branchSubsequentVariation: Math.PI / 2.8 }, // Spreading branches
        rules: { ...defaultTreeConfig.rules, minHeightForBranches: 50, minHeightForFruits: 150, minLeavesForFruits: 40 },
        branchParams: { ...defaultTreeConfig.branchParams, minBranchesAtMinHeight: 4, maxBranchesAtMaxHeight: 1500, scalingExponent: 1.7 }, // Many branches for dense canopy
        fruitSize: { min: 15, max: 25 }, // Mangoes
        minSizeForNewTree: 24,
        leafSize: { min: 22, max: 40 }, // Large leaves
        trunkWidthGrowthFactor: 0.06,
        maxChildBranchesPerBranch: 3,
        minBranchLengthForSubBranching: 7,
        maxChildRootsPerRoot: 3,
        minRootLengthForSubRooting: 5,
        leafPlacementRange: { min: 0.1, max: 1.0 },
        fruitPlacementRange: { min: 0.3, max: 0.7 }, // Fruits hang
        leafOutStartMonth: 1, // Tropical, longer leafing period
        leafOutEndMonth: 10,
    };

    const avocadoConfig = {
        name: "Avocado",
        maxHeight: 500,
        maxWidth: 38,
        colors: {
            trunk: '#8FBC8F', // Dark sea green (can vary)
            leaf: '#2E8B57', // Sea green
            fruit: '#556B2F', // Dark olive green for avocado skin
            root: '#715C3A', // Earthy brown
        },
        angles: { ...defaultTreeConfig.angles, branchSubsequentVariation: Math.PI / 2.5 },
        rules: { ...defaultTreeConfig.rules, minHeightForFruits: 120, minLeavesForFruits: 35 },
        branchParams: { ...defaultTreeConfig.branchParams, maxBranchesAtMaxHeight: 1400, scalingExponent: 1.65 },
        fruitSize: { min: 12, max: 20 }, // Avocados
        minSizeForNewTree: 19,
        leafSize: { min: 20, max: 35 },
        trunkWidthGrowthFactor: 0.058,
        maxChildBranchesPerBranch: 3,
        minBranchLengthForSubBranching: 6,
        maxChildRootsPerRoot: 3,
        minRootLengthForSubRooting: 6,
        leafPlacementRange: { min: 0.15, max: 0.95 },
        fruitPlacementRange: { min: 0.25, max: 0.75 },
        leafOutStartMonth: 1,
        leafOutEndMonth: 10,
    };

    const orangeConfig = {
        name: "Orange",
        maxHeight: 400, // Smaller tree
        maxWidth: 25,
        colors: {
            trunk: '#B8860B', // DarkGoldenRod
            leaf: '#008000', // Green
            fruit: '#FFA500', // Orange
            root: '#8B4513', // SaddleBrown
        },
        angles: { ...defaultTreeConfig.angles, branchInitialMin: -Math.PI * 0.9, branchInitialMax: -Math.PI * 0.1, branchSubsequentVariation: Math.PI / 2.9 },
        rules: { ...defaultTreeConfig.rules, minHeightForBranches: 40, minHeightForFruits: 100, minLeavesForFruits: 30 },
        branchParams: { ...defaultTreeConfig.branchParams, minBranchesAtMinHeight: 3, maxBranchesAtMaxHeight: 1600, scalingExponent: 1.75 }, // Bushy
        fruitSize: { min: 10, max: 16 }, // Oranges
        minSizeForNewTree: 15,
        leafSize: { min: 18, max: 30 },
        trunkWidthGrowthFactor: 0.052,
        maxChildBranchesPerBranch: 3,
        minBranchLengthForSubBranching: 5,
        maxChildRootsPerRoot: 2,
        minRootLengthForSubRooting: 5,
        leafPlacementRange: { min: 0.1, max: 0.95 },
        fruitPlacementRange: { min: 0.2, max: 0.8 },
        leafOutStartMonth: 2,
        leafOutEndMonth: 9, // Shorter active season than mango/avocado
    };

    // Legendary Trees
    const durianConfig = {
        name: "Durian",
        maxHeight: 700, // Tall, but not extremely so
        maxWidth: 33,
        colors: {
            trunk: '#7B684E', // Drab brown
            leaf: '#556B2F', // Dark olive green, often lighter underside
            fruit: '#BDB76B', // Dark khaki (spiky husk)
            root: '#654321', // Dark brown
        },
        angles: { ...defaultTreeConfig.angles, branchInitialMax: -Math.PI * 0.25 }, // Branches tend to be somewhat upright then spread
        rules: { ...defaultTreeConfig.rules, minHeightForBranches: 60, minHeightForFruits: 180, minLeavesForFruits: 50 },
        branchParams: { ...defaultTreeConfig.branchParams, maxBranchesAtMaxHeight: 1200, scalingExponent: 1.5 },
        fruitSize: { min: 20, max: 35 }, // Large, heavy fruits
        minSizeForNewTree: 34,
        leafSize: { min: 18, max: 30 },
        trunkWidthGrowthFactor: 0.053,
        maxChildBranchesPerBranch: 2,
        minBranchLengthForSubBranching: 10,
        maxChildRootsPerRoot: 2,
        minRootLengthForSubRooting: 8,
        leafPlacementRange: { min: 0.2, max: 0.9 },
        fruitPlacementRange: { min: 0.3, max: 0.6 }, // Heavy fruits hang closer to stronger parts
        leafOutStartMonth: 1, // Tropical
        leafOutEndMonth: 10,
    };

    const lycheeConfig = {
        name: "Lychee",
        maxHeight: 450, // Medium-sized, rounded canopy
        maxWidth: 30,
        colors: {
            trunk: '#A0522D', // Sienna, often grayish
            leaf: '#2E8B57', // Sea green, glossy
            fruit: '#FF007F', // Bright rose/pink for lychee fruit
            root: '#8B5A2B', // Darker, earthy brown
        },
        angles: { ...defaultTreeConfig.angles, branchSubsequentVariation: Math.PI / 2.7 }, // Dense, rounded canopy
        rules: { ...defaultTreeConfig.rules, minHeightForBranches: 35, minHeightForFruits: 90, minLeavesForFruits: 30 },
        branchParams: { ...defaultTreeConfig.branchParams, maxBranchesAtMaxHeight: 1700, scalingExponent: 1.8 }, // Very bushy
        fruitSize: { min: 6, max: 10 }, // Small fruits in clusters
        minSizeForNewTree: 9,
        leafSize: { min: 15, max: 28 },
        trunkWidthGrowthFactor: 0.05,
        maxChildBranchesPerBranch: 3,
        minBranchLengthForSubBranching: 4,
        maxChildRootsPerRoot: 3,
        minRootLengthForSubRooting: 4,
        leafPlacementRange: { min: 0.1, max: 1.0 },
        fruitPlacementRange: { min: 0.2, max: 0.8 }, // Fruits in panicles
        leafOutStartMonth: 2,
        leafOutEndMonth: 9,
    };

    // Mythical Tree
    const redwoodConfig = {
        name: "Redwood",
        maxHeight: 3000, // Extremely tall
        maxWidth: 80,    // Very thick trunk
        colors: {
            trunk: '#5C4033', // A more reddish-brown
            leaf: '#006400', // Dark green (scale-like leaves/sprays)
            fruit: '#654321', // Small cone color (dark brown)
            root: '#5C4033', // Deep, dark brown
        },
        angles: { // Branches are relatively short compared to height, often upswept initially
            ...defaultTreeConfig.angles,
            branchInitialMin: -Math.PI * 0.6,
            branchInitialMax: -Math.PI * 0.4,
            branchSubsequentVariation: Math.PI / 5, // Less variation to maintain verticality
        },
        rules: {
            ...defaultTreeConfig.rules,
            minHeightForBranches: 150, // Branches start higher up
            minHeightForFruits: 500,   // Fruits high up
            minLeavesForFruits: 200,
        },
        branchParams: { // Fewer main branches, but can be dense higher up
            ...defaultTreeConfig.branchParams,
            minBranchesAtMinHeight: 5,
            maxBranchesAtMaxHeight: 500, // Relative to height, not as "bushy" as smaller trees
            scalingExponent: 1.2,      // Slower increase in branch count with height
        },
        fruitSize: { min: 3, max: 6 },    // Small cones
        minSizeForNewTree: 5,
        leafSize: { min: 5, max: 15 },   // Representing small sprays/leaf scales - Increased size
        trunkWidthGrowthFactor: 0.025, // Grows proportionally narrower for its height
        maxChildBranchesPerBranch: 2,
        minBranchLengthForSubBranching: 20, // Branches must be long to sub-branch
        maxChildRootsPerRoot: 2,           // Massive root system, but not overly complex branching per root
        minRootLengthForSubRooting: 15,
        leafPlacementRange: { min: 0.1, max: 0.9 },
        fruitPlacementRange: { min: 0.7, max: 0.95 }, // Cones at tips of branches, high up
        leafOutStartMonth: 0, // Evergreen
        leafOutEndMonth: 11,
    };

    // --- End of New Tree Configurations ---

    availableTreeConfigs.push(
        oakConfig, beechConfig, mapleConfig, // Uncommon
        firConfig, pineConfig, spruceConfig, // Rare
        mangoConfig, avocadoConfig, orangeConfig, // Epic
        durianConfig, lycheeConfig, // Legendary
        redwoodConfig // Mythical
    );

    // Game variables
    let score = 0;
    let trees = [];
    let fallenFruits = [];
    let selectedTree = null; // To store the currently selected tree
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
	resizeCanvas();
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
        constructor(x, y, config, height = 10, width = 5) { // Added config parameter
            this.x = x;
            this.y = y; // Base of the trunk
            this.config = config; // Store the configuration
            this.height = height;
            this.width = width;
            // this.color = color; // Deprecated, use this.config.colors.trunk
            // this.maxWidth = maxWidth; // Deprecated, use this.config.maxWidth
            this.leaves = []; // To store leaf objects - will be deprecated for direct trunk leaves
            this.roots = [];  // To store root objects
            this.branches = []; // To store branch objects
            this.fruits = 0; // Counter for scoring, might be phased out
            this.fruitObjects = []; // To store Fruit objects
            this.isSelected = false; // To mark if the tree is currently selected
        }

        draw() {
             // Draw trunk (tapered)
            ctx.fillStyle = this.config.colors.trunk; // Use config color
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 2, this.y); // Bottom-left
            ctx.lineTo(this.x + this.width / 2, this.y); // Bottom-right
            ctx.lineTo(this.x, this.y - this.height);    // Top-center
            ctx.closePath();
            ctx.fill();

            // 2. Draw roots
            this.roots.forEach(root => root.draw());

            // 3. Draw branches themselves
            this.branches.forEach(branch => branch.drawBranchItself());

            // 4. Draw leaves of branches
            this.branches.forEach(branch => branch.drawBranchLeaves());

            // 5. Draw leaves on trunk (fallback)
            this.leaves.forEach(leaf => leaf.draw());

            // 6. Draw fruits
            this.fruitObjects.forEach(fruit => fruit.draw());

            // Glow effect for selected tree's trunk is handled before drawing the trunk.
            // Reset shadow properties after all components of this tree are drawn,
            // or more specifically, after the trunk if only it should glow.
            // For now, let's assume the glow should primarily be on the trunk and reset afterwards.
        }

        // Helper to reset shadow properties
        _resetShadow(context) {
            context.shadowColor = 'transparent';
            context.shadowBlur = 0;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;
        }

        draw() {
            // Always reset shadow at the start of this tree's draw call for a clean slate.
            this._resetShadow(ctx);

            if (this.isSelected && trees.length > 1) {
                ctx.shadowColor = 'white'; // Glow color
                ctx.shadowBlur = 15;       // Glow size/intensity
                // Ensure shadowOffset is 0 if not set elsewhere, good practice
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
            // No 'else' needed here to reset, as it's done at the start of draw()

             // Draw trunk (tapered) - this will now have a glow if isSelected was true
            ctx.fillStyle = this.config.colors.trunk;
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 2, this.y);
            ctx.lineTo(this.x + this.width / 2, this.y);
            ctx.lineTo(this.x, this.y - this.height);
            ctx.closePath();
            ctx.fill();

            // Always reset shadow after drawing the trunk (or any glowing parts)
            // to prevent glow affecting other parts of this tree or subsequent drawings.
            this._resetShadow(ctx);

            // 2. Draw roots
            this.roots.forEach(root => root.draw());

            // 3. Draw branches themselves
            this.branches.forEach(branch => branch.drawBranchItself());

            // 4. Draw leaves of branches
            this.branches.forEach(branch => branch.drawBranchLeaves());

            // 5. Draw leaves on trunk (fallback)
            this.leaves.forEach(leaf => leaf.draw());

            // 6. Draw fruits
            this.fruitObjects.forEach(fruit => fruit.draw());
        }


        growHeight(amount = 10) {
            if (this.height >= this.config.maxHeight) {
                console.log(`Tree has reached its maximum height of ${this.config.maxHeight}px.`);
                return;
            }

            if (this.height + amount > this.config.maxHeight) {
                amount = this.config.maxHeight - this.height;
                console.log(`Adjusted growth amount to reach maximum height of ${this.config.maxHeight}px.`);
            }

            this.height += amount;
            console.log(`Tree height increased to: ${this.height}`);

            const widthIncreaseFactor = this.config.trunkWidthGrowthFactor;
            const potentialWidthIncrease = amount * widthIncreaseFactor;

            if (this.width < this.config.maxWidth) {
                this.width += potentialWidthIncrease;
                if (this.width > this.config.maxWidth) {
                    this.width = this.config.maxWidth;
                }
                console.log(`Tree width increased to: ${this.width}`);
            }

            updateScore();
        }

        growWidth(amount = 2) { // Retained for potential direct use, though growHeight handles proportional width.
            if (this.width < this.config.maxWidth) {
                this.width += amount;
                if (this.width > this.config.maxWidth) {
                    this.width = this.config.maxWidth;
                }
                console.log(`Tree width increased to: ${this.width}`);
                updateScore();
            } else {
                console.log(`Tree width already at maximum: ${this.config.maxWidth}`);
            }
        }

        addLeaf(size, color) { // Parameters will be passed from button click / specific logic
            // Check month restrictions
            if (currentMonthIndex < this.config.leafOutStartMonth || currentMonthIndex > this.config.leafOutEndMonth) {
                console.log(`Cannot add leaf: Only allowed between ${months[this.config.leafOutStartMonth]} and ${months[this.config.leafOutEndMonth]}. Current month: ${months[currentMonthIndex]}.`);
                return false; // Indicate failure
            }

            const allBranches = this.getAllBranches();
            if (allBranches.length > 0) {
                const randomBranch = allBranches[Math.floor(Math.random() * allBranches.length)];
                // Use config for default leaf size and color if not provided
                const leafSize = size !== undefined ? size : (this.config.leafSize.min + Math.random() * (this.config.leafSize.max - this.config.leafSize.min));
                const leafColor = color !== undefined ? color : this.config.colors.leaf;
                randomBranch.addLeaf(leafSize, leafColor);
                return true; // Indicate success
            } else {
                console.log('Cannot add leaf: Tree has no branches.');
                return false; // Indicate failure
            }
        }

        addRoot() {
            const rootStartX = this.x - (this.width / 2) + (Math.random() * this.width);
            const rootStartY = this.y;

            const initialLength = (this.height / 15) + Math.random() * 10 + 10;
            const initialThickness = Math.max(2, this.width / 4);

            const baseAngle = this.config.angles.rootInitialBase;
            const angleDeviation = this.config.angles.rootInitialVariation;
            const initialAngle = baseAngle + (Math.random() * angleDeviation * 2 - angleDeviation);

            // Pass this.config.colors.root for the root color
            const newRoot = new Root(this, rootStartX, rootStartY, initialLength, initialAngle, initialThickness, this.config.colors.root);
            this.roots.push(newRoot);
            console.log(`Primary root added. Angle: ${initialAngle.toFixed(2)}`);

            const initialBranchingAttempts = 1 + Math.floor(Math.random() * 2); // Corrected: "initialBranchingAttempts" was "initialBranchingAttempts"
            for (let i = 0; i < initialBranchingAttempts; i++) {
                if (newRoot.length > this.config.minRootLengthForSubRooting && newRoot.childRoots.length < this.config.maxChildRootsPerRoot) {
                    newRoot.addChildRoot();
                }
            }
            if (newRoot.childRoots.length > 0) {
                newRoot.childRoots.forEach(childRoot => {
                    if (Math.random() < 0.5 && childRoot.length > this.config.minRootLengthForSubRooting && childRoot.childRoots.length < this.config.maxChildRootsPerRoot) {
                        childRoot.addChildRoot();
                    }
                });
            }
        }

        produceFruit(count = 1) {
            let producedCount = 0;
            const totalLeaves = this.getTotalLeaves();

            if (this.height < this.config.rules.minHeightForFruits) {
                console.log(`Tree is not tall enough to produce fruit. Min height: ${this.config.rules.minHeightForFruits}, current: ${this.height}`);
                return;
            }

            if (totalLeaves < this.config.rules.minLeavesForFruits) {
                console.log(`Tree does not have enough leaves to produce fruit. Min leaves: ${this.config.rules.minLeavesForFruits}, current: ${totalLeaves}`);
                return;
            }

            const branchesWithLeaves = this.getAllBranches().filter(branch => branch.leaves.length > 0);
            if (branchesWithLeaves.length === 0) {
                console.log("Cannot produce fruit: No branches have leaves.");
                return;
            }

            for (let i = 0; i < count; i++) {
                const randomBranchWithLeaves = branchesWithLeaves[Math.floor(Math.random() * branchesWithLeaves.length)];

                const placementMin = this.config.fruitPlacementRange.min;
                const placementMax = this.config.fruitPlacementRange.max;
                const positionOnBranch = placementMin + Math.random() * (placementMax - placementMin);

                const fruitBaseX = randomBranchWithLeaves.startX + Math.cos(randomBranchWithLeaves.angle) * randomBranchWithLeaves.length * positionOnBranch;
                const fruitBaseY = randomBranchWithLeaves.startY + Math.sin(randomBranchWithLeaves.angle) * randomBranchWithLeaves.length * positionOnBranch;

                const fruitSizeVal = this.config.fruitSize.min + (Math.random() * Math.random()) * (this.config.fruitSize.max - this.config.fruitSize.min);

                const perpendicularOffset = (Math.random() - 0.5) * fruitSizeVal * 2;
                const fruitX = fruitBaseX + Math.sin(randomBranchWithLeaves.angle) * perpendicularOffset;
                const fruitY = fruitBaseY - Math.cos(randomBranchWithLeaves.angle) * perpendicularOffset;

                this.fruitObjects.push(new Fruit(fruitX, fruitY, fruitSizeVal, this.config.colors.fruit));
                this.fruits++;
                producedCount++;
            }

            if (producedCount > 0) {
                console.log(`${producedCount} fruit(s) produced. Total fruit objects: ${this.fruitObjects.length}`);
                updateScore();
            }
        }

        getScore() {
            const volumeScore = this.width * this.height / 10;
            return Math.round(this.height + volumeScore + (this.fruitObjects.length * 5));
        }

        addBranch() {
            const maxAllowed = calculateMaxAllowedBranches( // This function will be updated in a later step
                this.height,
                this.config.rules.minHeightForBranches,
                this.config.maxHeight,
                this.config.branchParams.minBranchesAtMinHeight,
                this.config.branchParams.maxBranchesAtMaxHeight,
                this.config.branchParams.scalingExponent
            );

            if (this.getAllBranches().length >= maxAllowed) {
                console.log(`Cannot add trunk branch: maximum ${maxAllowed} branches for current height ${this.height} reached.`);
                return false;
            }

            if (this.height < this.config.rules.minHeightForBranches) {
                console.log(`Tree is too short for branches. Min height: ${this.config.rules.minHeightForBranches}, current: ${this.height}`);
                return false;
            }

            const eligibleTrunkHeight = this.height - this.config.rules.minHeightForBranches;
            if (eligibleTrunkHeight <= 0) {
                console.log("Not enough eligible trunk height for branches.");
                return false;
            }

            const randomProportionInEligible = Math.random() * 0.8;
            const branchStartY = (this.y - this.height) + (eligibleTrunkHeight * randomProportionInEligible);
            const branchStartX = this.x;

            const onLeft = Math.random() < 0.5;
            let angle;

            // Use configured angles from this.config.angles
            // These angles are assumed to be for the RIGHT side of the tree.
            // For the LEFT side, they will be mirrored.
            const minAngleConfig = this.config.angles.branchInitialMin;
            const maxAngleConfig = this.config.angles.branchInitialMax;

            // Generate a random angle within the configured range (for the right side)
            let baseAngle = minAngleConfig + Math.random() * (maxAngleConfig - minAngleConfig);

            if (onLeft) {
                // Mirror the angle for the left side.
                // e.g., if baseAngle is PI/6 (30 deg right-down), left angle is PI - PI/6 = 5PI/6 (30 deg left-down)
                angle = Math.PI - baseAngle;
                // Normalize angle to be within preferred ranges if necessary, e.g., -PI to PI.
                // Math.cos and Math.sin handle larger positive/negative angles correctly.
                // However, for consistency or debugging, normalization can be useful.
                // Example: if angle becomes 1.1*PI, it could be -0.9*PI.
                // Let's ensure it's in a common range like atan2 uses (-PI to PI)
                angle = Math.atan2(Math.sin(angle), Math.cos(angle));


            } else { // onRight
                angle = baseAngle;
            }
            // A future step could refine this to use them while maintaining symmetry if desired.

            const eligibleTrunkHeightForScaling = this.height - this.config.rules.minHeightForBranches;
            let scaleFactor = 1.0;

            if (eligibleTrunkHeightForScaling > 0) {
                const distanceFromTreeTop = branchStartY - (this.y - this.height);
                let normalizedPosition = distanceFromTreeTop / eligibleTrunkHeightForScaling;
                const minScale = 0.5;
                const maxScale = 1.0;
                scaleFactor = minScale + (maxScale - minScale) * normalizedPosition;
                scaleFactor = Math.max(minScale, Math.min(maxScale, scaleFactor));
            }

            const baseLength = (this.height / 5) + Math.random() * (this.height / 4);
            const baseThickness = Math.max(1, this.width / 4);
            const length = baseLength * scaleFactor;
            const thickness = Math.max(1, baseThickness * scaleFactor);

            this.branches.push(new Branch(this, branchStartX, branchStartY, length, angle, thickness, this.config.colors.trunk));
            console.log('Trunk branch added');
            return true;
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

    class FallenFruit {
        constructor(x, y, size, color) {
            this.x = x;
            this.y = y;
            this.size = size;
            this.color = color;
            this.groundedTime = 0; // Time in months since it fell
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        age() {
            this.groundedTime++;
        }
    }


    class Branch {
        constructor(parentTree, startX, startY, length, angle, thickness, color) {
            this.parentTree = parentTree;
            this.startX = startX;
            this.startY = startY;
            this.length = length;
            this.angle = angle;
            this.thickness = thickness;
            this.color = color;
            this.leaves = [];
            this.childBranches = [];
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
            this.childBranches.forEach(child => child.drawBranchItself());
        }

        drawBranchLeaves() {
            this.leaves.forEach(leaf => leaf.draw());
            this.childBranches.forEach(child => child.drawBranchLeaves());
        }

        addChildBranch() {
            const maxAllowedOnTree = calculateMaxAllowedBranches(
                this.parentTree.height,
                this.parentTree.config.rules.minHeightForBranches,
                this.parentTree.config.maxHeight,
                this.parentTree.config.branchParams.minBranchesAtMinHeight,
                this.parentTree.config.branchParams.maxBranchesAtMaxHeight,
                this.parentTree.config.branchParams.scalingExponent
            );

            if (this.parentTree.getAllBranches().length >= maxAllowedOnTree) {
                console.log(`Cannot add child branch: maximum ${maxAllowedOnTree} branches for current tree height ${this.parentTree.height} reached.`);
                return false;
            }

            if (this.length < this.parentTree.config.minBranchLengthForSubBranching || this.childBranches.length >= this.parentTree.config.maxChildBranchesPerBranch) {
                console.log("Branch is too short or already has enough child branches for sub-branching.");
                return false;
            }

            const newLength = this.length * (0.5 + Math.random() * 0.3);
            const newThickness = Math.max(1, this.thickness * 0.7);

            const angleVariation = this.parentTree.config.angles.branchSubsequentVariation;
            const newAngle = this.angle + (Math.random() * angleVariation * 2 - angleVariation);

            const newBranch = new Branch(this.parentTree, this.endX, this.endY, newLength, newAngle, newThickness, this.color);
            this.childBranches.push(newBranch);
            console.log("Child branch added.");
            return true;
        }

        addLeaf(size, color) { // Removed default size, will use config. color can still be passed or default.
            const configLeafSize = this.parentTree.config.leafSize;
            const leafSize = size !== undefined ? size : (configLeafSize.min + Math.random() * (configLeafSize.max - configLeafSize.min));
            const leafColor = color !== undefined ? color : this.parentTree.config.colors.leaf;


            const placementMin = this.parentTree.config.leafPlacementRange.min;
            const placementMax = this.parentTree.config.leafPlacementRange.max;
            const positionOnBranch = placementMin + Math.random() * (placementMax - placementMin);

            const leafBaseX = this.startX + Math.cos(this.angle) * this.length * positionOnBranch;
            const leafBaseY = this.startY + Math.sin(this.angle) * this.length * positionOnBranch;

            // Perpendicular offset should also scale with the new leafSize for better visual balance
            const perpendicularOffset = (Math.random() - 0.5) * leafSize * 1.5; // Adjusted multiplier from 3 to 1.5 due to larger base size
            const leafX = leafBaseX + Math.sin(this.angle) * perpendicularOffset;
            const leafY = leafBaseY - Math.cos(this.angle) * perpendicularOffset;

            // Pass the branch's angle to the Leaf constructor
            this.leaves.push(new Leaf(leafX, leafY, leafSize, leafColor, this.angle)); 
            console.log('Leaf added to branch');
        }
    }

    class Leaf {
        constructor(x, y, size, color, branchAngle) { // Added branchAngle
            this.x = x;
            this.y = y;
            this.size = size; // Diameter of the circle
            this.color = color;
            this.branchAngle = branchAngle; // Store the branch angle
            // Store random direction for gradient for consistency
            this.gradientAngle = Math.random() * 2 * Math.PI;
        }

        change_color(new_color) {
            this.color = new_color;
        }

        // Helper function to lighten or darken a color
        _adjustColor(colorInput, percent) {
            let hexColor = colorInput;
            // Convert named colors to hex - extend this map as needed
            const colorNameToHex = {
                "green": "#008000",
                "yellow": "#FFFF00",
                "lightgreen": "#90EE90"
                // Add other named colors used in your application if any
            };

            if (colorNameToHex[colorInput.toLowerCase()]) {
                hexColor = colorNameToHex[colorInput.toLowerCase()];
            }

            // Ensure hexColor is a valid hex string (starts with # and is 7 chars long)
            if (!hexColor.startsWith("#") || hexColor.length !== 7) {
                console.warn(`Invalid color format for _adjustColor: ${colorInput}. Defaulting to dark gray.`);
                hexColor = "#A9A9A9"; // Default to a dark gray or some other fallback
            }

            try {
                let r = parseInt(hexColor.substring(1, 3), 16);
                let g = parseInt(hexColor.substring(3, 5), 16);
                let b = parseInt(hexColor.substring(5, 7), 16);

                r = Math.min(255, Math.max(0, r + (r * percent / 100)));
                g = Math.min(255, Math.max(0, g + (g * percent / 100)));
                b = Math.min(255, Math.max(0, b + (b * percent / 100)));

                const RR = Math.round(r).toString(16).padStart(2, '0');
                const GG = Math.round(g).toString(16).padStart(2, '0');
                const BB = Math.round(b).toString(16).padStart(2, '0');

                return `#${RR}${GG}${BB}`;
            } catch (e) {
                console.error(`Error processing color ${hexColor} (original: ${colorInput}):`, e);
                return hexColor; // Return original hex or the mapped hex if parsing failed
            }
        }

        draw() {
            // Define gradient in local coordinates (leaf drawn with base at 0,0, tip pointing up local -Y)
            const radius = this.size / 2; // Use half of overall size for gradient extent
            
            // The leaf's main axis is along its local Y-axis (from 0 to -length).
            // The gradientAngle is a random angle. We want the gradient line to pass through
            // the center of the leaf's body. The leaf's body center is roughly at (0, -length/2).
            // Let's define the gradient relative to the leaf's center point in its local coordinate system.
            // The leaf's drawn length is `this.size`. Its center point is at `(0, -this.size / 2)` in local space.
            const localCenterY = -this.size / 2;

            // Calculate gradient line endpoints relative to this local center (0, localCenterY)
            const x0 = 0 - Math.cos(this.gradientAngle) * radius; // Centered at local X=0
            const y0 = localCenterY - Math.sin(this.gradientAngle) * radius;
            const x1 = 0 + Math.cos(this.gradientAngle) * radius; // Centered at local X=0
            const y1 = localCenterY + Math.sin(this.gradientAngle) * radius;

            const gradient = ctx.createLinearGradient(x0, y0, x1, y1);

            // Determine the second color for the gradient (lighter or darker)
            // For yellow leaves, make them slightly darker to avoid pure white
            // For green leaves, make them slightly lighter
            let color2;
            if (this.color === "yellow" || this.color.toLowerCase() === "#ffff00") {
                 color2 = this._adjustColor(this.color, -20); // Darken yellow by 20%
            } else if (this.color.startsWith("#")) { // Handle hex colors like green
                color2 = this._adjustColor(this.color, 20); // Lighten by 20%
            }
            else { // Default for named colors like "green"
                // Basic handling for named colors - can be expanded
                if (this.color === "green") color2 = "lightgreen";
                else color2 = this._adjustColor("#008000", 20); // Default to a lighter green if color is unknown green
            }


            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, color2);

            ctx.fillStyle = gradient;

            ctx.save(); // Save the current canvas state

            // Translate to the leaf's position (this.x, this.y)
            ctx.translate(this.x, this.y);

            // Rotate the canvas. Add Math.PI / 4 for 45 degrees.
            // Branch angles: 0 is right, -PI/2 is up.
            // A positive rotation in canvas is clockwise.
            // To point the leaf "outward" at 45 deg from branch:
            // If branch is pointing up (-PI/2), leaf should be -PI/2 + PI/4 = -PI/4 (upper right) OR -PI/2 - PI/4 = -3PI/4 (upper left)
            // Let's make it consistently one side, e.g., 45 degrees clockwise relative to the branch vector.
            // So, rotation will be this.branchAngle + Math.PI / 4.
            ctx.rotate(this.branchAngle + Math.PI / 4);

            ctx.beginPath();

            // Draw the leaf shape relative to (0,0) because we've translated the context.
            // The tip of the leaf will point "up" in the rotated coordinate system.
            const size = this.size; // Overall length of the leaf
            const width = size / 2; // Width of the leaf at its widest point
            const length = size;    // Full length from base to tip

            // Base of the leaf is now (0,0)
            const baseX = 0;
            const baseY = 0;

            // Tip of the leaf (pointy part)
            const tipX = baseX;      // Stays on the new Y-axis
            const tipY = baseY - length; // "Up" along the new Y-axis

            // Widest points of the leaf (oval part)
            const midY = baseY - length / 2;
            const leftX = baseX - width / 2;
            const rightX = baseX + width / 2;

            // Control points
            const controlPointBaseOffsetX = width / 2;

            ctx.moveTo(baseX, baseY); // Start at the base of the leaf stem (now 0,0)

            // Curve to the widest point on the left
            ctx.quadraticCurveTo(baseX - controlPointBaseOffsetX, baseY - length / 4, leftX, midY);
            // Curve from the widest point on the left to the tip
            ctx.quadraticCurveTo(baseX - width / 4, baseY - length * 0.75, tipX, tipY);
            // Curve from the tip to the widest point on the right
            ctx.quadraticCurveTo(baseX + width / 4, baseY - length * 0.75, rightX, midY);
            // Curve from the widest point on the right back to the base
            ctx.quadraticCurveTo(baseX + controlPointBaseOffsetX, baseY - length / 4, baseX, baseY);

            ctx.closePath();
            ctx.fill();

            ctx.restore(); // Restore the canvas state
        }
    }

    class Root {
        constructor(parentTree, startX, startY, length, angle, thickness, color = 'peru') {
            this.parentTree = parentTree;
            this.startX = startX;
            this.startY = startY;
            this.length = length;
            this.angle = angle;
            this.thickness = Math.max(1, thickness);
            this.color = color; // Use the passed color (from tree.config.colors.root)
            this.childRoots = [];

            this.endX = this.startX + Math.cos(this.angle) * this.length;
            this.endY = this.startY + Math.sin(this.angle) * this.length;
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

        addChildRoot() {
            if (this.length < this.parentTree.config.minRootLengthForSubRooting || this.childRoots.length >= this.parentTree.config.maxChildRootsPerRoot) {
                return;
            }

            const newLength = this.length * (0.5 + Math.random() * 0.4);
            const newThickness = Math.max(1, this.thickness * 0.8);

            let newAngle;
            let attempts = 0;
            const maxAttempts = 10;

            do {
                const angleVariation = (this.parentTree.config.angles.rootSubsequentVariation / 2) * (Math.random() - 0.5) * 2; // Use config
                newAngle = this.angle + angleVariation;
                newAngle = (newAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI;

                const forbiddenMin = - (3 * Math.PI / 4);
                const forbiddenMax = - (Math.PI / 4);

                if (newAngle > forbiddenMin && newAngle < forbiddenMax) {
                    if (newAngle < -Math.PI / 2) {
                        newAngle = -Math.PI + (Math.random() * Math.PI / 4);
                    } else {
                        newAngle = 0 - (Math.random() * Math.PI / 4);
                    }
                }
                attempts++;
            } while ((newAngle > (-3 * Math.PI / 4) && newAngle < (-Math.PI / 4)) && attempts < maxAttempts);

            if (attempts >= maxAttempts) {
                return;
            }

            let prospectiveEndY = this.endY + Math.sin(newAngle) * newLength;

            if (prospectiveEndY < this.parentTree.y) {
                if (this.endY <= this.parentTree.y + 2) {
                    if (newAngle < 0 && newAngle > -Math.PI) {
                        if (newAngle > -Math.PI / 2) {
                            newAngle = 0;
                        } else {
                            newAngle = Math.PI;
                        }
                        prospectiveEndY = this.endY + Math.sin(newAngle) * newLength;
                        if (prospectiveEndY < this.parentTree.y) {
                            return;
                        }
                    }
                } else {
                    return;
                }
            }

            if (prospectiveEndY > canvas.height - 2) {
                return;
            }

            if (newLength < 2) {
                return;
            }

            const newRoot = new Root(this.parentTree, this.endX, this.endY, newLength, newAngle, newThickness, this.color);
            this.childRoots.push(newRoot);

            if (Math.random() < 0.4 && newRoot.childRoots.length < this.parentTree.config.maxChildRootsPerRoot && newRoot.length > this.parentTree.config.minRootLengthForSubRooting) {
                newRoot.addChildRoot();
            }
        }
    }


    // UI Elements
    const growHeightButton = document.getElementById('grow-height-button');
    const growRootsButton = document.getElementById('grow-roots-button'); // Should this be per tree or global? Assume per selected tree for now.
    const growLeavesButton = document.getElementById('grow-leaves-button');
    const addBranchButton = document.getElementById('add-branch-button');
    const produceFruitButton = document.getElementById('produce-fruit-button');
    const plantNewTreeButton = document.getElementById('plant-new-tree-button');
    const scoreDisplay = document.getElementById('current-score');
    const currentMonthDisplay = document.getElementById('current-month-display');
    const availableNutrientsDisplay = document.getElementById('available-nutrients-display');
    const endTurnButton = document.getElementById('end-turn-button');

    // Input fields
    const growHeightInput = document.getElementById('grow-height-input');
    const growRootsInput = document.getElementById('grow-roots-input');

    // Utility function to calculate maximum allowed branches based on tree height
    // This function now uses parameters passed to it, which come from the tree's config.
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
            return minBranches;
        }

        const heightRatio = effectiveHeight / totalEffectiveHeightRange;
        const additionalBranches = (maxBranches - minBranches) * Math.pow(heightRatio, exponent);

        return Math.floor(minBranches + additionalBranches);
    }

    const growLeavesInput = document.getElementById('grow-leaves-input');
    const addBranchInput = document.getElementById('add-branch-input');
    const produceFruitInput = document.getElementById('produce-fruit-input');

    // Function to limit input length
    function limitInputLength(inputElement, maxLength) {
        inputElement.addEventListener('input', () => {
            if (inputElement.value.length > maxLength) {
                inputElement.value = inputElement.value.slice(0, maxLength);
            }
        });
    }

    // Apply the length limit to all relevant input fields
    limitInputLength(growHeightInput, 4);
    limitInputLength(growRootsInput, 4);
    limitInputLength(growLeavesInput, 4);
    limitInputLength(addBranchInput, 4);
    limitInputLength(produceFruitInput, 4);

    // Game State Variables
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let currentMonthIndex = 0;
    let availableNutrients = 10000;

    // Update UI Functions
    function updateMonthDisplay() {
        if (currentMonthDisplay) {
            currentMonthDisplay.textContent = `Month: ${months[currentMonthIndex]}`;
        }
    }

    function updateNutrientsDisplay() {
        if (availableNutrientsDisplay) {
            availableNutrientsDisplay.textContent = `Nutrients: ${availableNutrients}`;
        }
    }

    // Game Setup
    function initializeGame() {
        resizeCanvas(); // Call resizeCanvas first to set correct canvas dimensions
		console.log(`canvas.width=${canvas.width}, canvas.clientWidth=${canvas.clientWidth}`);
console.log(`canvas.height=${canvas.height}, canvas.clientHeight=${canvas.clientHeight}`);

        // Create the first tree
        if (trees.length === 0) {
            // Calculate initial X position in screen coordinates (e.g., center of the canvas)
            const initialScreenX = canvas.width / 2;
            // Convert screen coordinate to world coordinate
            const initialWorldX = (initialScreenX - panX) / zoomLevel;
            const initialTreeY = WORLD_TREE_BASE_Y; // Y is already a world coordinate

            // Use the first configuration from the availableTreeConfigs array
            const firstTree = new Tree(initialWorldX, initialTreeY, redwoodConfig);
            trees.push(firstTree);
            selectedTree = firstTree; // Select the first tree
            selectedTree.isSelected = true;
            currentConfigIndex = 0; // Reset index for subsequent plantings
            panToTree(selectedTree); // Center the initial tree
			selectedTree.x = (canvas.width / 2 - panX) / zoomLevel;
        }
        updateMonthDisplay();
        updateNutrientsDisplay();
        updateButtonStates(); // Centralized button state management (will now use selectedTree)
        gameLoop();
    }

	function resizeCanvas() {
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		drawGame();
		if (selectedTree) {
			panToTree(selectedTree);
		}
	}

    window.addEventListener('resize', resizeCanvas);

    function updateButtonStates() {
        const noNutrients = availableNutrients <= 0;

        if (!selectedTree) { // If no tree is selected
            growHeightButton.disabled = true;
            addBranchButton.disabled = true;
            growLeavesButton.disabled = true;
            produceFruitButton.disabled = true;
            growRootsButton.disabled = true;
            plantNewTreeButton.disabled = true; // Also disable plant new tree if no tree selected initially (though logic below might override)
        } else {
            // Grow Height button
            growHeightButton.disabled = noNutrients || selectedTree.height >= selectedTree.config.maxHeight;

            // Grow Roots button - only nutrient check needed beyond having a selected tree
            growRootsButton.disabled = noNutrients;

            // Add Branch button
            const maxAllowedBranches = calculateMaxAllowedBranches(
                selectedTree.height,
                selectedTree.config.rules.minHeightForBranches,
                selectedTree.config.maxHeight,
                selectedTree.config.branchParams.minBranchesAtMinHeight,
                selectedTree.config.branchParams.maxBranchesAtMaxHeight,
                selectedTree.config.branchParams.scalingExponent
            );
            const currentBranches = selectedTree.getAllBranches().length;
            addBranchButton.disabled = noNutrients || selectedTree.height < selectedTree.config.rules.minHeightForBranches || currentBranches >= maxAllowedBranches;

            // Grow Leaves button
            const canGrowLeavesThisMonth = currentMonthIndex >= selectedTree.config.leafOutStartMonth && currentMonthIndex <= selectedTree.config.leafOutEndMonth;
            growLeavesButton.disabled = noNutrients || selectedTree.getAllBranches().length === 0 || !canGrowLeavesThisMonth;

            // Produce fruit button
            const canProduceFruitConditions = selectedTree.height >= selectedTree.config.rules.minHeightForFruits &&
                selectedTree.getTotalLeaves() >= selectedTree.config.rules.minLeavesForFruits;
            produceFruitButton.disabled = noNutrients || !canProduceFruitConditions;
        }

        // Plant new tree button - enabled if ANY tree has fruit of sufficient size AND nutrients are available
        const anyTreeHasViableFruit = trees.some(tree => tree.fruitObjects.some(fruit => fruit.size >= tree.config.minSizeForNewTree));
        plantNewTreeButton.disabled = noNutrients || !anyTreeHasViableFruit;

        // If there's no selected tree, but nutrients are zero, plantNewTreeButton should also be disabled.
        // The above handles this. If selectedTree is null, noNutrients might still be true, disabling it.
        // If selectedTree is null and noNutrients is false, it will be disabled by !anyTreeHasFruit if no tree has fruit.
        // If no tree is selected, most buttons are disabled at the top. We need to ensure plantNewTreeButton follows suit
        // if it wasn't already covered.
        if (!selectedTree && plantNewTreeButton) { // plantNewTreeButton might not be defined if HTML is missing
             // It will be disabled if noNutrients is true OR if !anyTreeHasFruit is true.
             // If selectedTree is null, the specific tree conditions don't apply, only global ones like nutrients or anyTreeHasFruit.
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
        trees.forEach(tree => {
            tree.draw();
        });

        fallenFruits.forEach(fruit => {
            fruit.draw();
        });

       

        ctx.restore(); // Restore to pre-zoom/pan state (identity transform)
    }

    // Event Listeners for UI
    growHeightButton.addEventListener('click', () => {
        if (selectedTree) {
            const requestedOperations = parseInt(growHeightInput.value, 10) || 1;
            if (requestedOperations <= 0) {
                console.log("Requested growth amount must be positive.");
                return;
            }

            // Determine max operations possible based on available nutrients
            const maxAffordableOperations = Math.min(requestedOperations, availableNutrients);

            if (maxAffordableOperations > 0) {
                const potentialGrowthAmount = maxAffordableOperations * 10; // Potential growth based on affordable nutrients

                const heightBeforeGrowth = selectedTree.height;
                // The growHeight method internally caps growth to selectedTree.config.maxHeight
                selectedTree.growHeight(potentialGrowthAmount);
                const heightAfterGrowth = selectedTree.height;
                const actualHeightIncrease = heightAfterGrowth - heightBeforeGrowth;

                // Calculate nutrients actually consumed based on actual growth
                // Each 10 units of height costs 1 nutrient.
                // Math.ceil is used in case growth isn't a perfect multiple of 10 (though current growHeight(10) implies it should be)
                const nutrientsConsumed = actualHeightIncrease > 0 ? Math.ceil(actualHeightIncrease / 10) : 0;

                // Deduct the actual nutrients consumed
                availableNutrients -= nutrientsConsumed;

                updateScore(); // Also calls updateButtonStates
                updateNutrientsDisplay();

                if (requestedOperations > maxAffordableOperations) {
                    console.log(`Not enough nutrients for the full requested growth of ${requestedOperations*10}px. Attempted growth with ${maxAffordableOperations} nutrients, resulting in ${actualHeightIncrease}px growth and consuming ${nutrientsConsumed} nutrients.`);
                } else if (potentialGrowthAmount > actualHeightIncrease) {
                    // This means growth was capped by maxHeight, not by nutrients
                    console.log(`Tree reached max height. Requested growth corresponding to ${maxAffordableOperations} nutrients, but actual growth was ${actualHeightIncrease}px, consuming ${nutrientsConsumed} nutrients.`);
                } else if (nutrientsConsumed > 0) {
                    console.log(`Tree grew by ${actualHeightIncrease}px, consuming ${nutrientsConsumed} nutrients.`);
                }

                if (nutrientsConsumed === 0 && maxAffordableOperations > 0 && actualHeightIncrease === 0) {
                    // This case handles when tree is already at max height
                     console.log(`Tree is already at its maximum height (${selectedTree.config.maxHeight}px). No growth occurred, no nutrients consumed.`);
                }

            } else { // maxAffordableOperations is 0
                if (availableNutrients <= 0 && requestedOperations > 0) {
                    console.log("Not enough nutrients to grow height.");
                } else {
                    // This case should ideally be caught by requestedOperations <= 0 check earlier,
                    // but as a fallback or if requestedOperations was valid but availableNutrients was 0.
                    console.log("Cannot grow height: No nutrients available or requested growth was zero/negative.");
                }
            }
        } else {
            console.log("No tree selected to grow height.");
        }
    });

    growRootsButton.addEventListener('click', () => {
        if (selectedTree) {
            let count = parseInt(growRootsInput.value, 10) || 1;
            let rootsAdded = 0;
            for (let i = 0; i < count; i++) {
                if (availableNutrients > 0) {
                    availableNutrients--;
                    selectedTree.addRoot();
                    rootsAdded++;
                } else {
                    console.log("Not enough nutrients to add more roots.");
                    break;
                }
            }
            if (rootsAdded > 0) {
                updateScore(); // Also calls updateButtonStates
                updateNutrientsDisplay();
            }
        }
    });

    growLeavesButton.addEventListener('click', () => {
        if (selectedTree) {
            let count = parseInt(growLeavesInput.value, 10) || 1;
            let leavesSuccessfullyAdded = 0;
            if (count <= 0) {
                console.log("Number of leaves to add must be positive.");
                return;
            }

            for (let i = 0; i < count; i++) {
                if (availableNutrients <= 0) {
                    console.log("Not enough nutrients to add more leaves.");
                    break;
                }

                // Attempt to add a leaf. addLeaf now returns true for success, false for failure.
                // Size and color are defaults from addLeaf method if not specified.
                if (selectedTree.addLeaf()) {
                    availableNutrients--; // Consume nutrient only if leaf was successfully added
                    leavesSuccessfullyAdded++;
                } else {
                    // addLeaf already logs the reason for failure (e.g., month restriction, no branches)
                    // If it failed due to month/branch restrictions, we don't want to stop trying for the remaining count
                    // unless nutrients run out. If it failed but nutrients were available, the loop continues.
                    // No nutrient consumed in this case.
                    console.log(`Attempt to add leaf ${i+1} failed. Checking next attempt if count > 1 and nutrients available.`);
                }
            }

            if (leavesSuccessfullyAdded > 0) {
                console.log(`${leavesSuccessfullyAdded} leaves added successfully.`);
                updateScore(); // Also calls updateButtonStates
                updateNutrientsDisplay();
            } else {
                console.log("No leaves were added in this operation.");
                // Still update displays/buttons in case nutrient check caused an early exit
                // or if all attempts failed for other reasons.
                updateNutrientsDisplay();
                updateButtonStates();
            }
        }
    });

    produceFruitButton.addEventListener('click', () => {
        if (selectedTree) {
            let count = parseInt(produceFruitInput.value, 10) || 1;
            let fruitsProduced = 0;
            // Check general conditions first (height, leaves)
            if (selectedTree.height < selectedTree.config.rules.minHeightForFruits || selectedTree.getTotalLeaves() < selectedTree.config.rules.minLeavesForFruits) {
                console.log("Tree cannot produce fruit due to height or leaf count.");
                updateButtonStates(); // Ensure button state is accurate
                return;
            }

            for (let i = 0; i < count; i++) {
                if (availableNutrients > 0) {
                    availableNutrients--;
                    selectedTree.produceFruit(1); // Produce one fruit at a time to check nutrients for each
                    fruitsProduced++;
                } else {
                    console.log("Not enough nutrients to produce more fruit.");
                    break;
                }
            }
            if (fruitsProduced > 0) {
                updateScore(); // Also calls updateButtonStates
                updateNutrientsDisplay();
            } else {
                // If no fruits were produced but an attempt was made, ensure buttons are correctly updated
                // e.g. if nutrients ran out before any could be made.
                updateButtonStates();
                updateNutrientsDisplay(); // In case nutrients were available but other conditions failed for all attempts.
            }
        }
    });

    plantNewTreeButton.addEventListener('click', () => {
        let parentTree = null;
        let fruitIndex = -1;

        const findViableParent = (tree) => {
            const index = tree.fruitObjects.findIndex(fruit => fruit.size >= tree.config.minSizeForNewTree);
            if (index !== -1) {
                parentTree = tree;
                fruitIndex = index;
                return true;
            }
            return false;
        };

        if (selectedTree && findViableParent(selectedTree)) {
            // A suitable fruit was found in the selected tree
        } else {
            // Search all trees for a suitable fruit
            trees.find(findViableParent);
        }
        
        if (parentTree && fruitIndex !== -1 && availableNutrients > 0) {
            availableNutrients--;
            parentTree.fruitObjects.splice(fruitIndex, 1);
            parentTree.fruits = parentTree.fruitObjects.length;

            const newScreenX = Math.random() * (canvas.width - 60) + 30;
            const newWorldX = (newScreenX - panX) / zoomLevel;
            const newY = WORLD_TREE_BASE_Y;

            currentConfigIndex = (currentConfigIndex + 1) % availableTreeConfigs.length;
            const selectedConfig = availableTreeConfigs[currentConfigIndex];
            const newTree = new Tree(newWorldX, newY, selectedConfig);
            trees.push(newTree);

            if (selectedTree) {
                selectedTree.isSelected = false;
            }
            newTree.isSelected = true;
            selectedTree = newTree;

            console.log(`New tree planted with config: ${selectedConfig.name}. It is now selected.`);
            panToTree(selectedTree);
            updateScore(); // Also calls updateButtonStates
            updateNutrientsDisplay();
        } else if (availableNutrients <= 0) {
            console.log('Not enough nutrients to plant a new tree.');
            updateButtonStates(); // Ensure button state is accurate
        } else if (!parentTree) {
            console.log('No tree has fruit to plant a new one.');
            // No nutrient change, but button state might need update if it depended on fruit.
            updateButtonStates();
        }
    });

    addBranchButton.addEventListener('click', () => {
        if (!selectedTree) {
            console.log("No tree selected to add branches to.");
            return;
        }

        const desiredCount = parseInt(addBranchInput.value, 10) || 1;
        if (desiredCount <= 0) {
            console.log("Number of branches to add must be positive.");
            return;
        }

        let branchesSuccessfullyAdded = 0;
        let consecutiveFailures = 0;
        const MAX_CONSECUTIVE_FAILURES = 10; // Stop after this many failures in a row

        console.log(`Attempting to add ${desiredCount} branches.`);

        while (branchesSuccessfullyAdded < desiredCount && availableNutrients > 0 && consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
            if (availableNutrients <= 0) {
                console.log("Out of nutrients during branch adding process.");
                break;
            }

            availableNutrients--; // Tentatively spend nutrient

            let attemptSuccessful = false;
            const allBranches = selectedTree.getAllBranches(); // Get current branches state for decisions

            // Decision logic: add to trunk or existing branch
            // Prioritize trunk if few branches or tree is young, or by chance
            const shouldTryTrunk = selectedTree.branches.length === 0 ||
                                   Math.random() < 0.4 ||
                                   selectedTree.height < selectedTree.config.rules.minHeightForBranches + 20;

            if (shouldTryTrunk) {
                // console.log("Attempting to add branch to trunk...");
                if (selectedTree.addBranch()) { // addBranch now returns true/false
                    attemptSuccessful = true;
                    // console.log("Successfully added branch to trunk.");
                } else {
                    // console.log("Failed to add branch to trunk. Trying child branch if possible.");
                    // If trunk fails, try adding to a child branch if conditions allow as a fallback for this iteration
                    if (allBranches.length > 0) {
                        const randomBranch = allBranches[Math.floor(Math.random() * allBranches.length)];
                        // console.log("Fallback: Attempting to add to an existing branch...");
                        if (randomBranch.addChildBranch()) { // addChildBranch now returns true/false
                            attemptSuccessful = true;
                            // console.log("Successfully added child branch as fallback.");
                        }
                    }
                }
            } else if (allBranches.length > 0) { // If not trying trunk, and there are branches, try adding to a child
                // console.log("Attempting to add branch to an existing branch...");
                const randomBranch = allBranches[Math.floor(Math.random() * allBranches.length)];
                if (randomBranch.addChildBranch()) { // addChildBranch now returns true/false
                    attemptSuccessful = true;
                    // console.log("Successfully added child branch.");
                }
            } else {
                // No branches yet, and initial trunk attempt (implicit in shouldTryTrunk or first iteration) might have failed
                // or this is a state where shouldTryTrunk is false but there are no allBranches (should be rare)
                // Try trunk one last time this iteration if all else failed.
                // console.log("No existing branches to add to, or previous attempts failed. Final attempt on trunk for this iteration...");
                if (selectedTree.addBranch()) {
                    attemptSuccessful = true;
                }
            }

            if (attemptSuccessful) {
                branchesSuccessfullyAdded++;
                consecutiveFailures = 0; // Reset on success
                // console.log(`Branch ${branchesSuccessfullyAdded} of ${desiredCount} added successfully.`);
            } else {
                availableNutrients++; // Refund nutrient for failed attempt
                consecutiveFailures++;
                console.log(`Failed to add a branch (attempt ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES} consecutive). Nutrient refunded.`);
            }
        }

        if (branchesSuccessfullyAdded > 0) {
            console.log(`Successfully added ${branchesSuccessfullyAdded} of ${desiredCount} requested branches.`);
            updateScore(); // Also calls updateButtonStates
            updateNutrientsDisplay();
        } else {
            console.log(`No branches were added. Requested: ${desiredCount}.`);
            // Ensure UI is updated even if no branches were added (e.g. nutrients might have changed if initial attempts failed)
            updateButtonStates();
            updateNutrientsDisplay();
        }

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.log(`Stopped adding branches after ${MAX_CONSECUTIVE_FAILURES} consecutive failed attempts. Added ${branchesSuccessfullyAdded} branches.`);
        }
        if (branchesSuccessfullyAdded < desiredCount && availableNutrients <= 0 && desiredCount > 0) {
            console.log(`Ran out of nutrients. Added ${branchesSuccessfullyAdded} of ${desiredCount} requested branches.`);
        }
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
    let clickStartTime = 0;
    let clickStartMouseX = 0;
    let clickStartMouseY = 0;
    const CLICK_THRESHOLD_MS = 200; // Max time for a click
    const CLICK_MOVE_THRESHOLD_PX = 5; // Max movement for a click
    // CLICK_PADDING is now a global constant defined at the top of the file
	
	// Function to check if mouse is over any tree
    function isMouseOverAnyTree(canvasX, canvasY) {
        const worldX = (canvasX - panX) / zoomLevel;
        const worldY = (canvasY - panY) / zoomLevel;

        for (const tree of trees) {
            const minClickX = tree.x - tree.width / 2 - CLICK_PADDING;
            const maxClickX = tree.x + tree.width / 2 + CLICK_PADDING;
            const treeTopY = tree.y - tree.height;
            const treeBaseY = tree.y;

            if (worldX >= minClickX && worldX <= maxClickX && worldY >= treeTopY && worldY <= treeBaseY) {
                return true; // Mouse is over this tree
            }
        }
        return false; // Mouse is not over any tree
    }

    
    canvas.addEventListener('mousedown', (e) => {
        // Check if the click is on the canvas itself, not UI elements if they were overlaid
        isPanning = true; // Assume panning until mouseup
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        clickStartMouseX = e.clientX;
        clickStartMouseY = e.clientY;
        clickStartTime = Date.now();
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
			} else {
            // Update cursor based on hover if not panning
            const rect = canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            if (isMouseOverAnyTree(canvasX, canvasY)) {
                canvas.style.cursor = 'pointer';
            } else {
                canvas.style.cursor = 'grab'; // Default cursor when not panning and not over a tree
            }
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        const clickDuration = Date.now() - clickStartTime;
        const distanceMoved = Math.sqrt(
            Math.pow(e.clientX - clickStartMouseX, 2) +
            Math.pow(e.clientY - clickStartMouseY, 2)
        );

        if (isPanning) { // isPanning is true if mousedown happened on canvas
            isPanning = false; // Reset panning state
            canvas.style.cursor = 'grab';

            if (clickDuration < CLICK_THRESHOLD_MS && distanceMoved < CLICK_MOVE_THRESHOLD_PX) {
                // This is a click
                handleCanvasClick(e.clientX, e.clientY);
            }
        }
    });

    function handleCanvasClick(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;
        const worldX = (canvasX - panX) / zoomLevel;
        const worldY = (canvasY - panY) / zoomLevel;

        // --- Detailed Click Debug Logging Removed ---
        // console.log('--- Click Debug ---');
        // console.log(`e.clientX: ${clientX.toFixed(2)}`);
        // console.log(`rect.left: ${rect.left.toFixed(2)}`);
        // console.log(`canvasX (clientX - rect.left): ${canvasX.toFixed(2)}`);
        // console.log(`panX: ${panX.toFixed(2)}`);
        // console.log(`zoomLevel: ${zoomLevel.toFixed(2)}`);
        // console.log(`worldX ((canvasX - panX) / zoomLevel): ${worldX.toFixed(2)}`);
        // console.log(`canvasY: ${canvasY.toFixed(2)}, worldY: ${worldY.toFixed(2)}`); // Also log Y for context
        // console.log('-------------------');

        // Original debug logs, can be kept or removed if redundant with new logging
        // console.log(`[DEBUG] handleCanvasClick invoked. clientX: ${clientX}, clientY: ${clientY}`);
        // console.log(`[DEBUG] canvasX: ${canvasX.toFixed(2)}, canvasY: ${canvasY.toFixed(2)}`);
        console.log(`[DEBUG] Current panX: ${panX.toFixed(2)}, panY: ${panY.toFixed(2)}, zoomLevel: ${zoomLevel.toFixed(2)}`); // Kept this one for general pan/zoom state on click
        console.log(`[DEBUG] Calculated worldX: ${worldX.toFixed(2)}, worldY: ${worldY.toFixed(2)}`); // Kept this one for click world coords

        let clickedOnTree = false;
        const previousSelectedTreeName = selectedTree ? selectedTree.config.name : 'null';
        console.log(`[DEBUG] Before loop, current selectedTree: ${previousSelectedTreeName}`);

        for (let i = trees.length - 1; i >= 0; i--) {
            const tree = trees[i];
            const treeName = tree.config.name || `Tree-${i}`; // Fallback name for logging
            console.log(`[DEBUG] Checking tree [${i}] (${treeName}): X=${tree.x.toFixed(2)}, Y=${tree.y.toFixed(2)}, W=${tree.width.toFixed(2)}, H=${tree.height.toFixed(2)}, isSelected=${tree.isSelected}`);

            // Adjust clickable area width: add CLICK_PADDING padding on each side
            const minClickX = tree.x - tree.width / 2 - CLICK_PADDING;
            const maxClickX = tree.x + tree.width / 2 + CLICK_PADDING;
            const treeTopY = tree.y - tree.height; // Y decreases upwards
            const treeBaseY = tree.y;
            console.log(`[DEBUG] Tree [${i}] (${treeName}) clickable bounds (with padding): X[${minClickX.toFixed(2)} to ${maxClickX.toFixed(2)}], Y[${treeTopY.toFixed(2)} to ${treeBaseY.toFixed(2)}]`);

            const isInsideX = worldX >= minClickX && worldX <= maxClickX;
            const isInsideY = worldY >= treeTopY && worldY <= treeBaseY; 

            if (isInsideX && isInsideY) {
                console.log(`[DEBUG] Click IS INSIDE tree [${i}] (${treeName})`);
                clickedOnTree = true;

                if (selectedTree === tree) {
                    console.log(`[DEBUG] Re-clicked the currently selected tree [${i}] (${treeName}). No change in selection.`);
                    // No actual change in selection, but we might still want to pan or do something.
                    // For now, just break as the correct tree is already selected.
                } else {
                    console.log(`[DEBUG] Clicked on a DIFFERENT tree [${i}] (${treeName}). Switching selection from: ${selectedTree ? selectedTree.config.name : 'null'}`);
                    if (selectedTree) {
                        console.log(`[DEBUG] Deselecting old tree: ${selectedTree.config.name}, setting its isSelected to false.`);
                        selectedTree.isSelected = false;
                    }
                    tree.isSelected = true;
                    selectedTree = tree;
                    console.log(`[DEBUG] NEW selectedTree is now [${i}] (${selectedTree.config.name}). Its isSelected is now: ${selectedTree.isSelected}`);
                }
                break; // Stop checking other trees once the topmost clicked tree is found and processed.
            } else {
                // console.log(`[DEBUG] Click is OUTSIDE tree [${i}] (${treeName})`); // Can be noisy, enable if needed
            }
        }

        const finalSelectedTreeName = selectedTree ? selectedTree.config.name : 'null';
        console.log(`[DEBUG] After loop, final selectedTree: ${finalSelectedTreeName} (was ${previousSelectedTreeName}). ClickedOnTree: ${clickedOnTree}`);

        if (clickedOnTree && selectedTree) {
            // Pan only if the selection actually changed or if it's a re-click on the selected tree
            // and we decide re-clicking should also pan (current logic will pan on re-click if it breaks from the first if block)
            // The current logic will pan if clickedOnTree is true and selectedTree is not null.
            console.log(`[DEBUG] Panning to selected tree: ${selectedTree.config.name}`);
            panToTree(selectedTree); 
        } else if (!clickedOnTree) {
            console.log("[DEBUG] Click was not on any tree. No pan action.");
        }
        
        console.log("[DEBUG] Calling updateButtonStates().");
        updateButtonStates();
        // console.log("[DEBUG] handleCanvasClick finished."); // For tracing end
    }

    function panToTree(tree) {
        if (!tree) return;

        // Calculate the target center point of the tree in world coordinates.
        // Let's center on the middle of the trunk horizontally (tree.x)
        // and vertically on the mid-height of the trunk (tree.y - tree.height / 2).
        const targetWorldX = tree.x;
        const targetWorldY = tree.y - tree.height / 2;

        // Calculate the desired panX and panY to bring this world point to the center of the canvas view.
        // targetPanX = canvas.width / 2 - worldPointX * zoomLevel
        // targetPanY = canvas.height / 2 - worldPointY * zoomLevel
        panX = canvas.width / 2 - targetWorldX * zoomLevel;
        panY = canvas.height / 2 - targetWorldY * zoomLevel;

        console.log(`Panned to tree: ${tree.config.name}. New panX: ${panX}, panY: ${panY}`);
        // The gameLoop will handle redrawing with the new panX and panY.
        // If immediate redraw is needed and gameLoop isn't fast enough, uncomment:
        // drawGame(); 
    }

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

    endTurnButton.addEventListener('click', () => {
        currentMonthIndex++;
        if (currentMonthIndex >= months.length) {
            currentMonthIndex = 0;
        }
        updateMonthDisplay();
        availableNutrients += 1; // Gain 1 nutrient per turn
        updateNutrientsDisplay();
        updateButtonStates(); // Update button states as nutrients have changed

        // Age and remove old fallen fruits
        fallenFruits.forEach(fruit => fruit.age());
        fallenFruits = fallenFruits.filter(fruit => fruit.groundedTime < 3); // Remove after 3 months

        // Autumn seasonal changes
        trees.forEach(tree => {
            const allBranches = tree.getAllBranches();
            if (currentMonthIndex === 7) { // August
                console.log(`Harvest Time: August - ${tree.config.name} fruits are falling.`);
                tree.fruitObjects = tree.fruitObjects.filter(fruit => {
                    if (fruit.size >= tree.config.minSizeForNewTree) {
                        // Fruit is big enough, falls to the ground
                        const fallenFruit = new FallenFruit(fruit.x, tree.y, fruit.size, fruit.color);
                        fallenFruits.push(fallenFruit);
                        return false; // Remove from tree
                    }
                    return false; // Remove from tree (disappears)
                });
                tree.fruits = tree.fruitObjects.length; // Update fruit count
            } else if (currentMonthIndex === 8) { // September
                console.log(`Autumn: September - ${tree.config.name} leaves turning yellow.`);
                allBranches.forEach(branch => {
                    branch.leaves.forEach(leaf => {
                        if (Math.random() < 0.5) {
                            leaf.change_color("yellow");
                        }
                    });
                });
            } else if (currentMonthIndex === 9) { // October
                console.log(`Autumn: October - ${tree.config.name} yellow leaves falling, rest turning yellow.`);
                allBranches.forEach(branch => {
                    // Remove leaves that were already yellow
                    branch.leaves = branch.leaves.filter(leaf => {
                        if (leaf.color === "yellow") {
                            // console.log("A yellow leaf fell."); // Optional: too noisy
                            return false; // Remove
                        }
                        return true; // Keep
                    });
                    // Change remaining green leaves to yellow
                    branch.leaves.forEach(leaf => {
                        if (leaf.color === "green") { // Ensure we only change green leaves
                            leaf.change_color("yellow");
                        }
                    });
                });
            } else if (currentMonthIndex === 10) { // November
                console.log(`Autumn: November - ${tree.config.name} all remaining leaves falling.`);
                allBranches.forEach(branch => {
                    branch.leaves = [];
                });
            }
        });
        // End of seasonal changes

        console.log(`Turn ended. New month: ${months[currentMonthIndex]}. Nutrients: ${availableNutrients}`);
    });


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

    // Debug Button Functionality
    const debugPlantAllMaxedTreesButton = document.getElementById('debug-plant-all-maxed-trees-button');
    if (debugPlantAllMaxedTreesButton) {
        debugPlantAllMaxedTreesButton.addEventListener('click', () => {
            console.log("DEBUG: Plant All Maxed Trees button clicked.");

            const originalNutrients = availableNutrients;
            const originalMonthIndex = currentMonthIndex;
            availableNutrients = 1000000; // Grant a large number of nutrients for debugging
            currentMonthIndex = 3; // Set to April (a good month for leaf growth for many trees)
            updateNutrientsDisplay(); // Update display for temp nutrients
            updateMonthDisplay(); // Update display for temp month

            let currentXOffset = 0; // To space out trees

            availableTreeConfigs.forEach((config, index) => {
                // Calculate initial X position in screen coordinates, then convert to world
                // Ensure trees are spaced out enough so they don't overlap too much
                const initialScreenX = (canvas.width / 2) + currentXOffset - ( (availableTreeConfigs.length / 2) * (config.maxWidth + 100) ); // Base screen X + offset
                const treeWorldX = (initialScreenX - panX) / zoomLevel;
                const treeWorldY = WORLD_TREE_BASE_Y;

                console.log(`DEBUG: Planting ${config.name} at worldX: ${treeWorldX}`);
                const tree = new Tree(treeWorldX, treeWorldY, config);
                trees.push(tree);
                selectedTree = tree; // Select the new tree for operations
                tree.isSelected = true;

                // 1. Grow to max height
                console.log(`DEBUG: Growing ${config.name} to maxHeight.`);
                tree.growHeight(config.maxHeight); // growHeight handles not exceeding maxHeight

                // 2. Add 50 roots
                console.log(`DEBUG: Adding 50 roots to ${config.name}.`);
                for (let i = 0; i < 50; i++) {
                    if (availableNutrients > 0) {
                        tree.addRoot();
                        availableNutrients--; // Still consume for tracking, though we have plenty
                    } else break;
                }

                // 3. Add 100 branches
                // Need to ensure tree is tall enough for branches based on its config
                console.log(`DEBUG: Adding 100 branches to ${config.name}.`);
                let branchesAdded = 0;
                let branchAttempts = 0;
                while(branchesAdded < 100 && branchAttempts < 500) { // Attempt limit to prevent infinite loops
                    if (availableNutrients > 0) {
                        availableNutrients--; // Consume nutrient for the attempt

                        let attemptSuccessful = false;
                        const allCurrentBranches = tree.getAllBranches();

                        // Decision logic: add to trunk or existing branch
                        const shouldTryTrunk = tree.branches.length === 0 || // No branches yet, must go to trunk
                                           Math.random() < 0.3 || // 30% chance to try trunk
                                           allCurrentBranches.length < 5 || // Few branches overall, prioritize trunk
                                           (allCurrentBranches.length > 0 && Math.random() < 0.1); // Small chance to go to trunk even if many child branches exist

                        if (shouldTryTrunk) {
                            if (tree.addBranch()) { // Adds to trunk
                                attemptSuccessful = true;
                            }
                        }

                        // If trunk attempt was not made or failed, and there are branches, try adding to a child.
                        // Or, even if trunk succeeded, 70% chance to also try adding a child branch if possible.
                        if (!attemptSuccessful || (allCurrentBranches.length > 0 && Math.random() < 0.7)) {
                            if (allCurrentBranches.length > 0) {
                                const randomExistingBranch = allCurrentBranches[Math.floor(Math.random() * allCurrentBranches.length)];
                                if (randomExistingBranch.addChildBranch()) {
                                    attemptSuccessful = true; // Could be true even if trunk also succeeded this iteration
                                }
                            }
                        }

                        // If no branch was added (neither trunk nor child), and we initially decided against trunk or trunk failed,
                        // make a final attempt to add to trunk if conditions allow, to ensure growth if possible.
                        if (!attemptSuccessful && !shouldTryTrunk) {
                            if (tree.addBranch()) {
                                attemptSuccessful = true;
                            }
                        }

                        if (attemptSuccessful) {
                            branchesAdded++;
                        } else {
                            availableNutrients++; // Refund nutrient if no branch was added
                        }
                        branchAttempts++;
                    } else break; // Out of nutrients
                    if(branchAttempts % 50 === 0) console.log(`DEBUG: ${config.name} branch attempt ${branchAttempts}, added ${branchesAdded} of 100 target`);
                }
                console.log(`DEBUG: ${config.name} finished adding branches. Total added: ${branchesAdded}`);


                // 4. Add 500 leaves
                // Ensure tree has branches and it's a valid month (temporarily set)
                console.log(`DEBUG: Adding 500 leaves to ${config.name}. Current month is ${months[currentMonthIndex]}`);
                let leavesAdded = 0;
                let leafAttempts = 0;
                while(leavesAdded < 500 && leafAttempts < 1000) { // Attempt limit
                     if (availableNutrients > 0) {
                        if (tree.addLeaf()) { // addLeaf will pick a random branch
                            leavesAdded++;
                            availableNutrients--;
                        }
                        leafAttempts++;
                    } else break;
                }
                console.log(`DEBUG: ${config.name} finished adding leaves. Total added: ${leavesAdded}`);

                // 5. Produce 50 fruits
                // Ensure tree meets conditions (height, leaves)
                console.log(`DEBUG: Producing 50 fruits for ${config.name}.`);
                let fruitsProduced = 0;
                let fruitAttempts = 0;
                while(fruitsProduced < 50 && fruitAttempts < 200) { // Attempt limit
                    if (availableNutrients > 0) {
                        // produceFruit checks conditions internally
                        // Temporarily boost leaves if needed for fruit production for debug
                        if (tree.getTotalLeaves() < tree.config.rules.minLeavesForFruits && tree.getAllBranches().length > 0) {
                            console.log(`DEBUG: ${config.name} has ${tree.getTotalLeaves()} leaves, needs ${tree.config.rules.minLeavesForFruits}. Temporarily adding more leaves for fruit prod.`);
                            for(let l=0; l< tree.config.rules.minLeavesForFruits - tree.getTotalLeaves() + 5; l++) tree.addLeaf();
                        }

                        tree.produceFruit(1); // produceFruit adds to tree.fruitObjects
                        // We need to check if a fruit was actually added, as produceFruit might not if conditions fail
                        // For this debug, let's assume it will if we ensure leaves.
                        // The produceFruit method itself increments tree.fruits and adds to fruitObjects.
                        // Let's count based on the object array length change for robustness.
                        const currentFruitCount = tree.fruitObjects.length;
                        if (tree.fruitObjects.length > fruitsProduced) { // Check if a fruit was actually added.
                           fruitsProduced = tree.fruitObjects.length; // Update count based on actual objects
                           availableNutrients--;
                        } else {
                            // If produceFruit didn't add, maybe a condition is still failing.
                            // console.log(`DEBUG: Fruit production failed for ${config.name} on attempt ${fruitAttempts + 1}`);
                        }
                        fruitAttempts++;
                    } else break;
                }
                // Ensure the tree.fruits counter matches fruitObjects.length after all operations
                tree.fruits = tree.fruitObjects.length;
                console.log(`DEBUG: ${config.name} finished producing fruits. Total produced (actual objects): ${tree.fruitObjects.length}`);


                currentXOffset += (config.maxWidth + 250); // Increment offset for the next tree, increased spacing
                if (selectedTree) selectedTree.isSelected = false; // Deselect previous before selecting next
            });

            if (trees.length > 0) {
                selectedTree = trees[trees.length - 1]; // Select the last planted debug tree
                selectedTree.isSelected = true;
                panToTree(selectedTree); // Pan to the last one
            }

            // Restore original game state
            availableNutrients = originalNutrients;
            currentMonthIndex = originalMonthIndex;
            updateNutrientsDisplay();
            updateMonthDisplay();
            updateScore(); // This also calls updateButtonStates
            console.log("DEBUG: Finished planting all maxed trees.");
        });
    }
});