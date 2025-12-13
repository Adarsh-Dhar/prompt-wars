// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OutcomeToken
 * @notice ERC20 token representing YES or NO outcome in prediction market
 */
contract OutcomeToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

/**
 * @title PredictionMarket
 * @notice A binary prediction market where users can buy YES/NO outcome tokens
 */
contract PredictionMarket is ReentrancyGuard {
    // Enums
    enum Outcome {
        Yes,
        No
    }

    // Structs
    struct Market {
        address authority;
        uint64 marketId;
        string question;
        address yesToken;
        address noToken;
        address collateralToken;
        uint256 endTime;
        bool isResolved;
        bool hasWinningOutcome;
        Outcome winningOutcome;
        uint256 totalYesSupply;
        uint256 totalNoSupply;
    }

    // State variables
    mapping(uint64 => Market) public markets;
    mapping(address => mapping(uint64 => uint256)) public collateralVaults;
    uint64 public nextMarketId;

    // Constants
    uint256 public constant MAX_QUESTION_LENGTH = 200;

    // Events
    event MarketInitialized(
        uint64 indexed marketId,
        address indexed authority,
        string question,
        uint256 endTime,
        address yesToken,
        address noToken
    );

    event TokensPurchased(
        uint64 indexed marketId,
        address indexed user,
        Outcome outcome,
        uint256 amount
    );

    event TokensSold(
        uint64 indexed marketId,
        address indexed user,
        Outcome outcome,
        uint256 amount
    );

    event MarketResolved(
        uint64 indexed marketId,
        Outcome winningOutcome
    );

    event WinningsClaimed(
        uint64 indexed marketId,
        address indexed user,
        uint256 amount
    );

    // Errors
    error QuestionTooLong();
    error InvalidEndTime();
    error MarketAlreadyResolved();
    error MarketEnded();
    error MarketNotEnded();
    error MarketNotResolved();
    error InvalidAmount();
    error Unauthorized();
    error MarketNotFound();
    error TransferFailed();

    /**
     * @notice Initialize a new prediction market
     * @param question The question for the market
     * @param endTime Unix timestamp when the market ends
     * @param collateralToken Address of the collateral token (e.g., USDC)
     * @return marketId The ID of the newly created market
     */
    function initializeMarket(
        string memory question,
        uint256 endTime,
        address collateralToken
    ) external returns (uint64 marketId) {
        if (bytes(question).length > MAX_QUESTION_LENGTH) revert QuestionTooLong();
        if (endTime <= block.timestamp) revert InvalidEndTime();

        marketId = nextMarketId++;

        // Deploy YES and NO tokens
        OutcomeToken yesToken = new OutcomeToken(
            string(abi.encodePacked("YES-", _uintToString(marketId))),
            string(abi.encodePacked("YES", _uintToString(marketId))),
            address(this)
        );

        OutcomeToken noToken = new OutcomeToken(
            string(abi.encodePacked("NO-", _uintToString(marketId))),
            string(abi.encodePacked("NO", _uintToString(marketId))),
            address(this)
        );

        markets[marketId] = Market({
            authority: msg.sender,
            marketId: marketId,
            question: question,
            yesToken: address(yesToken),
            noToken: address(noToken),
            collateralToken: collateralToken,
            endTime: endTime,
            isResolved: false,
            hasWinningOutcome: false,
            winningOutcome: Outcome.Yes, // Default, not used until resolved
            totalYesSupply: 0,
            totalNoSupply: 0
        });

        emit MarketInitialized(
            marketId,
            msg.sender,
            question,
            endTime,
            address(yesToken),
            address(noToken)
        );
    }

    /**
     * @notice Buy outcome tokens by depositing collateral
     * @param marketId The ID of the market
     * @param amount Amount of collateral to deposit (and tokens to receive)
     * @param outcome The outcome to bet on (Yes or No)
     */
    function buyTokens(
        uint64 marketId,
        uint256 amount,
        Outcome outcome
    ) external nonReentrant {
        Market storage market = markets[marketId];
        
        if (market.authority == address(0)) revert MarketNotFound();
        if (market.isResolved) revert MarketAlreadyResolved();
        if (block.timestamp >= market.endTime) revert MarketEnded();
        if (amount == 0) revert InvalidAmount();

        // Transfer collateral from user to this contract
        bool success = IERC20(market.collateralToken).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) revert TransferFailed();

        collateralVaults[market.collateralToken][marketId] += amount;

        // Mint outcome tokens to user
        if (outcome == Outcome.Yes) {
            OutcomeToken(market.yesToken).mint(msg.sender, amount);
            market.totalYesSupply += amount;
        } else {
            OutcomeToken(market.noToken).mint(msg.sender, amount);
            market.totalNoSupply += amount;
        }

        emit TokensPurchased(marketId, msg.sender, outcome, amount);
    }

    /**
     * @notice Sell outcome tokens to get collateral back (before resolution)
     * @param marketId The ID of the market
     * @param amount Amount of tokens to sell
     * @param outcome The outcome tokens to sell
     */
    function sellTokens(
        uint64 marketId,
        uint256 amount,
        Outcome outcome
    ) external nonReentrant {
        Market storage market = markets[marketId];
        
        if (market.authority == address(0)) revert MarketNotFound();
        if (market.isResolved) revert MarketAlreadyResolved();
        if (block.timestamp >= market.endTime) revert MarketEnded();
        if (amount == 0) revert InvalidAmount();

        // Burn outcome tokens from user
        if (outcome == Outcome.Yes) {
            OutcomeToken(market.yesToken).burn(msg.sender, amount);
            market.totalYesSupply -= amount;
        } else {
            OutcomeToken(market.noToken).burn(msg.sender, amount);
            market.totalNoSupply -= amount;
        }

        collateralVaults[market.collateralToken][marketId] -= amount;

        // Transfer collateral back to user
        bool success = IERC20(market.collateralToken).transfer(msg.sender, amount);
        if (!success) revert TransferFailed();

        emit TokensSold(marketId, msg.sender, outcome, amount);
    }

    /**
     * @notice Resolve the market with the winning outcome
     * @param marketId The ID of the market
     * @param winningOutcome The outcome that won (Yes or No)
     */
    function resolveMarket(
        uint64 marketId,
        Outcome winningOutcome
    ) external {
        Market storage market = markets[marketId];
        
        if (market.authority == address(0)) revert MarketNotFound();
        if (market.isResolved) revert MarketAlreadyResolved();
        if (block.timestamp < market.endTime) revert MarketNotEnded();
        if (msg.sender != market.authority) revert Unauthorized();

        market.isResolved = true;
        market.hasWinningOutcome = true;
        market.winningOutcome = winningOutcome;

        emit MarketResolved(marketId, winningOutcome);
    }

    /**
     * @notice Claim winnings after market is resolved
     * @param marketId The ID of the market
     * @param amount Amount of winning tokens to redeem
     */
    function claimWinnings(
        uint64 marketId,
        uint256 amount
    ) external nonReentrant {
        Market storage market = markets[marketId];
        
        if (market.authority == address(0)) revert MarketNotFound();
        if (!market.isResolved) revert MarketNotResolved();
        if (amount == 0) revert InvalidAmount();

        // Burn winning tokens
        if (market.winningOutcome == Outcome.Yes) {
            OutcomeToken(market.yesToken).burn(msg.sender, amount);
        } else {
            OutcomeToken(market.noToken).burn(msg.sender, amount);
        }

        collateralVaults[market.collateralToken][marketId] -= amount;

        // Transfer collateral to winner
        bool success = IERC20(market.collateralToken).transfer(msg.sender, amount);
        if (!success) revert TransferFailed();

        emit WinningsClaimed(marketId, msg.sender, amount);
    }

    /**
     * @notice Get market details
     * @param marketId The ID of the market
     */
    function getMarket(uint64 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    /**
     * @notice Get collateral vault balance for a market
     * @param collateralToken The collateral token address
     * @param marketId The ID of the market
     */
    function getVaultBalance(
        address collateralToken,
        uint64 marketId
    ) external view returns (uint256) {
        return collateralVaults[collateralToken][marketId];
    }

    // Internal helper function
    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}