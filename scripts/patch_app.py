import re

with open('d:/Monopoly/src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update GameModal signature and props
old_game_modal_head = '''function GameModal({
  type, close, setModal, navigate, selectedProperty, taxSpaceName,
  players = initialPlayers, activePlayerIndex = 0,
  setPlayers, onShowToast, onBuyResolved,
}: {
  type: Exclude<Modal, null>;
  close: () => void;
  setModal: (m: Modal) => void;
  navigate: (s: Screen) => void;
  selectedProperty: PropertyDefinition | SpecialPropertyDefinition;
  taxSpaceName?: string;
  players?: EnginePlayer[];
  activePlayerIndex?: number;
  setPlayers?: React.Dispatch<React.SetStateAction<EnginePlayer[]>>;
  onShowToast?: (msg: string) => void;
  onBuyResolved?: () => void;
}) {
  const [eventDice, setEventDice] = useState(type === "chance" ? 3 : 2);'''

new_game_modal_head = '''function GameModal({
  type, close, setModal, navigate, selectedProperty, taxSpaceName,
  players = initialPlayers, activePlayerIndex = 0,
  setPlayers, onShowToast, onBuyResolved,
  lastDiceTotal, onModalAcknowledged, playerPositions,
}: {
  type: Exclude<Modal, null>;
  close: () => void;
  setModal: (m: Modal) => void;
  navigate: (s: Screen) => void;
  selectedProperty: PropertyDefinition | SpecialPropertyDefinition;
  taxSpaceName?: string;
  players?: EnginePlayer[];
  activePlayerIndex?: number;
  setPlayers?: React.Dispatch<React.SetStateAction<EnginePlayer[]>>;
  onShowToast?: (msg: string) => void;
  onBuyResolved?: () => void;
  lastDiceTotal?: number;
  onModalAcknowledged?: () => void;
  playerPositions?: number[];
}) {
  const initialDice = lastDiceTotal && lastDiceTotal >= 2 && lastDiceTotal <= 12
    ? lastDiceTotal
    : (type === "chance" ? 3 : 2);
  const [eventDice, setEventDice] = useState(initialDice);'''

assert old_game_modal_head in text, "Could not find old_game_modal_head"
text = text.replace(old_game_modal_head, new_game_modal_head, 1)

# 2. Update Chance/Chest section in GameModal
old_chance_chest = '''  // ── CHANCE / CHEST ──
  if (type === "chance" || type === "chest") {
    const declarations = type === "chance" ? CHANCE_DECLARATIONS : CHEST_DECLARATIONS;
    const declaration = declarations.find((item) => item.diceSum === eventDice) ?? declarations[0];
    return (
      <ModalShell close={close} className={`event-modal ${type}`}>
        <div className="event-kicker">{type === "chance" ? "CHANCE" : "COMMUNITY CHEST"}</div>
        <DeclarationDice total={declaration.diceSum} />
        <div className="dice-declaration-picker" aria-label="Preview dice declarations">
          {declarations.map((item) => (
            <button
              key={item.diceSum}
              className={item.diceSum === declaration.diceSum ? "active" : ""}
              onClick={() => setEventDice(item.diceSum)}
            >
              {item.diceSum}
            </button>
          ))}
        </div>
        <small className="declaration-parity">{declaration.section.toUpperCase()} DECLARATION</small>
        <strong className="event-title">{declaration.title}</strong>
        <p>{declaration.declaration}</p>
        <div className={`event-result ${type} result-${declaration.kind}`}>
          <span>{declaration.effect}</span>
          <small>{declaration.effectNote}</small>
        </div>
        <Button onClick={close}>CONTINUE</Button>
      </ModalShell>
    );
  }'''

new_chance_chest = '''  // ── CHANCE / CHEST ──
  if (type === "chance" || type === "chest") {
    const declarations = type === "chance" ? CHANCE_DECLARATIONS : CHEST_DECLARATIONS;
    const declaration = declarations.find((item) => item.diceSum === eventDice) ?? declarations[0];
    const isFromRoll = typeof lastDiceTotal === "number";

    const handleAcknowledge = () => {
      close();
      if (onModalAcknowledged) onModalAcknowledged();
    };

    return (
      <ModalShell close={handleAcknowledge} className={`event-modal ${type}`}>
        <div className="event-kicker">{type === "chance" ? "CHANCE" : "COMMUNITY CHEST"}</div>
        <DeclarationDice total={declaration.diceSum} />
        {!isFromRoll && (
          <div className="dice-declaration-picker" aria-label="Preview dice declarations">
            {declarations.map((item) => (
              <button
                key={item.diceSum}
                className={item.diceSum === declaration.diceSum ? "active" : ""}
                onClick={() => setEventDice(item.diceSum)}
              >
                {item.diceSum}
              </button>
            ))}
          </div>
        )}
        <small className="declaration-parity">{declaration.section.toUpperCase()} DECLARATION</small>
        <strong className="event-title">{declaration.title}</strong>
        <p>{declaration.declaration}</p>
        <div className={`event-result ${type} result-${declaration.kind}`}>
          <span>{declaration.effect}</span>
          <small>{declaration.effectNote}</small>
        </div>
        <Button onClick={handleAcknowledge}>CONTINUE</Button>
      </ModalShell>
    );
  }'''

assert old_chance_chest in text, "Could not find old_chance_chest"
text = text.replace(old_chance_chest, new_chance_chest, 1)

# 3. Update Jail/Rest/Tax in GameModal
old_jail_rest_tax = '''  // ── JAIL / REST ──
  if (type === "jail" || type === "rest") {
    return (
      <ModalShell close={close} className="state-modal">
        <div className="state-icon">{type === "jail" ? "III" : "RH"}</div>
        <small className="eyebrow">{type === "jail" ? "SPECIAL STATE" : "SAFE HAVEN"}</small>
        <strong className="event-title">{type === "jail" ? "SENT TO JAIL" : "REST HOUSE"}</strong>
        <p>
          {type === "jail"
            ? "Your token is in Jail. Roll doubles on your next turn or serve 3 turns to be released."
            : "Take a breath. Your turn ends safely here and you miss your next move."}
        </p>
        <div className="meaning-box">
          <span>WHAT HAPPENS NEXT</span>
          <b>{type === "jail" ? "Roll doubles to escape, or wait 3 turns." : "Play continues with the next player."}</b>
        </div>
        <Button onClick={close}>{type === "jail" ? "UNDERSTOOD" : "END TURN"}</Button>
      </ModalShell>
    );
  }

  // ── TAX ──
  if (type === "tax") {
    return (
      <ModalShell close={close} className="state-modal">
        <div className="state-icon">Rs</div>
        <small className="eyebrow">GOVERNMENT LEVY</small>
        <strong className="event-title">{taxSpaceName || "TAX ASSESSMENT"}</strong>
        <p>You landed on a government assessment space. Rs500 has been deducted from your account.</p>
        <div className="meaning-box">
          <span>TAX PAID</span>
          <b>Rs500 · Deducted from player cash</b>
        </div>
        <Button onClick={close}>CONTINUE</Button>
      </ModalShell>
    );
  }'''

new_jail_rest_tax = '''  // ── JAIL / REST ──
  if (type === "jail" || type === "rest") {
    const handleClose = () => {
      close();
      if (onModalAcknowledged) onModalAcknowledged();
    };
    return (
      <ModalShell close={handleClose} className="state-modal">
        <div className="state-icon">{type === "jail" ? "III" : "RH"}</div>
        <small className="eyebrow">{type === "jail" ? "SPECIAL STATE" : "SAFE HAVEN"}</small>
        <strong className="event-title">{type === "jail" ? "SENT TO JAIL" : "REST HOUSE"}</strong>
        <p>
          {type === "jail"
            ? "Your token is in Jail. Roll doubles on your next turn or serve 3 turns to be released."
            : "Take a breath. Your turn ends safely here and you miss your next move."}
        </p>
        <div className="meaning-box">
          <span>WHAT HAPPENS NEXT</span>
          <b>{type === "jail" ? "Roll doubles to escape, or wait 3 turns." : "Play continues with the next player."}</b>
        </div>
        <Button onClick={handleClose}>{type === "jail" ? "UNDERSTOOD" : "END TURN"}</Button>
      </ModalShell>
    );
  }

  // ── TAX ──
  if (type === "tax") {
    const handleClose = () => {
      close();
      if (onModalAcknowledged) onModalAcknowledged();
    };
    return (
      <ModalShell close={handleClose} className="state-modal">
        <div className="state-icon">Rs</div>
        <small className="eyebrow">GOVERNMENT LEVY</small>
        <strong className="event-title">{taxSpaceName || "TAX ASSESSMENT"}</strong>
        <p>You landed on a government assessment space. Rs500 has been deducted from your account.</p>
        <div className="meaning-box">
          <span>TAX PAID</span>
          <b>Rs500 · Deducted from player cash</b>
        </div>
        <Button onClick={handleClose}>CONTINUE</Button>
      </ModalShell>
    );
  }'''

assert old_jail_rest_tax in text, "Could not find old_jail_rest_tax"
text = text.replace(old_jail_rest_tax, new_jail_rest_tax, 1)

# 4. Update Build in GameModal
old_build = '''  // ── BUILD ──
  if (type === "build") {
    const isCity = "buildingCost" in selectedProperty;
    const city = isCity ? (selectedProperty as PropertyDefinition) : null;
    const buildCost = city?.buildingCost || 5000;
    const activePlayer = players[activePlayerIndex];
    const userMoney = activePlayer.money;
    const balanceAfter = userMoney - buildCost;
    const currentBuildings = activePlayer.buildings[selectedProperty.id] || 0;
    const currentRent = city
      ? (currentBuildings === 0 ? city.baseRent : currentBuildings === 1 ? city.rentOneHouse : currentBuildings === 2 ? city.rentTwoHouses : currentBuildings === 3 ? city.rentThreeHouses : city.hotelRent)
      : 0;
    const nextRent = city
      ? (currentBuildings === 0 ? city.rentOneHouse : currentBuildings === 1 ? city.rentTwoHouses : currentBuildings === 2 ? city.rentThreeHouses : city.hotelRent)
      : 0;
    const groupTheme = getColorGroupTheme(city?.colorGroup);

    const handleConfirmBuild = async () => {
      if (!isCity || !city || userMoney < buildCost || currentBuildings >= 4) return;
      const res = await defaultEngine.buildHouseOrHotel(activePlayerIndex, selectedProperty.id);
      if (res.success && setPlayers) {
        setPlayers(res.state.players);
        if (onShowToast) onShowToast(`BUILT ON ${city.name.toUpperCase()} · -Rs${buildCost.toLocaleString()}`);
      }
      close();
    };

    return (
      <ModalShell title="BUILD ON PROPERTY" close={close}>
        <div className="build-property" style={{ borderLeft: `4px solid ${groupTheme.accent}` }}>
          <div className="tiny-building" style={{ background: groupTheme.accent }}>
            {currentBuildings >= 3 ? "H" : "&#x1F3E0;"}
          </div>
          <span>
            <small>{selectedProperty.name.toUpperCase()} · {groupTheme.label}</small>
            <strong>{currentBuildings >= 3 ? "Upgrade to Hotel" : `Add House #${currentBuildings + 1}`}</strong>
          </span>
        </div>
        <div className="rent-change">
          <div><small>CURRENT RENT</small><b>Rs{currentRent.toLocaleString()}</b></div>
          <Icon name="arrow" />
          <div><small>UPGRADED RENT</small><b style={{ color: groupTheme.accent }}>Rs{nextRent.toLocaleString()}</b></div>
        </div>
        <div className="balance-check">
          <span>BUILDING COST</span><b>Rs{buildCost.toLocaleString()}</b>
          <span>BALANCE AFTER</span><b>Rs{balanceAfter.toLocaleString()}</b>
        </div>
        <Button
          onClick={handleConfirmBuild}
          disabled={userMoney < buildCost || currentBuildings >= 4 || !!activePlayer.mortgages[selectedProperty.id]}
        >
          {currentBuildings >= 4
            ? "MAX BUILDINGS REACHED"
            : userMoney < buildCost
            ? "INSUFFICIENT FUNDS"
            : `CONFIRM BUILD · Rs${buildCost.toLocaleString()}`}
        </Button>
        <Button variant="ghost" onClick={close}>CANCEL</Button>
      </ModalShell>
    );
  }'''

new_build = '''  // ── BUILD ──
  if (type === "build") {
    const isCity = "buildingCost" in selectedProperty;
    const city = isCity ? (selectedProperty as PropertyDefinition) : null;
    const buildCost = city?.buildingCost || 5000;
    const activePlayer = players[activePlayerIndex];
    const userMoney = activePlayer.money;
    const balanceAfter = userMoney - buildCost;
    const currentBuildings = activePlayer.buildings[selectedProperty.id] || 0;
    const currentRent = city
      ? (currentBuildings === 0 ? city.baseRent : currentBuildings === 1 ? city.rentOneHouse : currentBuildings === 2 ? city.rentTwoHouses : currentBuildings === 3 ? city.rentThreeHouses : city.hotelRent)
      : 0;
    const nextRent = city
      ? (currentBuildings === 0 ? city.rentOneHouse : currentBuildings === 1 ? city.rentTwoHouses : currentBuildings === 2 ? city.rentThreeHouses : city.hotelRent)
      : 0;
    const groupTheme = getColorGroupTheme(city?.colorGroup);

    const groupProps = city?.colorGroup ? COLOR_GROUPS[city.colorGroup]?.properties ?? [] : [];
    const ownsCompleteGroup = groupProps.length > 0 && groupProps.every((name) => {
      const prop = getCityProperty(name);
      return prop && activePlayer.ownedProperties.includes(prop.id);
    });

    const propSpaceIndex = BOARD_SPACES.findIndex((s) => s.propertyId === selectedProperty.id);
    const standingOnProperty = playerPositions ? playerPositions[activePlayerIndex] === propSpaceIndex : true;

    const canBuild = isCity && !!city && userMoney >= buildCost && currentBuildings < 4 && !activePlayer.mortgages[selectedProperty.id] && ownsCompleteGroup && standingOnProperty;

    const handleConfirmBuild = async () => {
      if (!canBuild) return;
      const res = await defaultEngine.buildHouseOrHotel(activePlayerIndex, selectedProperty.id);
      if (res.success && setPlayers) {
        setPlayers(res.state.players);
        if (onShowToast) onShowToast(`BUILT ON ${city.name.toUpperCase()} · -Rs${buildCost.toLocaleString()}`);
      } else {
        if (onShowToast) onShowToast(`CANNOT BUILD: Check complete color group & landing (Rule 24)`);
      }
      close();
    };

    return (
      <ModalShell title="BUILD ON PROPERTY" close={close}>
        <div className="build-property" style={{ borderLeft: `4px solid ${groupTheme.accent}` }}>
          <div className="tiny-building" style={{ background: groupTheme.accent }}>
            {currentBuildings >= 3 ? "H" : "&#x1F3E0;"}
          </div>
          <span>
            <small>{selectedProperty.name.toUpperCase()} · {groupTheme.label}</small>
            <strong>{currentBuildings >= 3 ? "Upgrade to Hotel" : `Add House #${currentBuildings + 1}`}</strong>
          </span>
        </div>
        <div className="rent-change">
          <div><small>CURRENT RENT</small><b>Rs{currentRent.toLocaleString()}</b></div>
          <Icon name="arrow" />
          <div><small>UPGRADED RENT</small><b style={{ color: groupTheme.accent }}>Rs{nextRent.toLocaleString()}</b></div>
        </div>
        <div className="balance-check">
          <span>BUILDING COST</span><b>Rs{buildCost.toLocaleString()}</b>
          <span>BALANCE AFTER</span><b>Rs{balanceAfter.toLocaleString()}</b>
        </div>
        {!ownsCompleteGroup && (
          <div className="lobby-tip" style={{ borderLeftColor: "var(--red)", marginTop: "8px" }}>
            <span>RULE REQUIREMENT</span>Must own all 5 properties in {groupTheme.label} before building.
          </div>
        )}
        {ownsCompleteGroup && !standingOnProperty && (
          <div className="lobby-tip" style={{ borderLeftColor: "var(--gold)", marginTop: "8px" }}>
            <span>RULE 24</span>Must land on {selectedProperty.name.toUpperCase()} to build on it.
          </div>
        )}
        <Button
          onClick={handleConfirmBuild}
          disabled={!canBuild}
        >
          {currentBuildings >= 4
            ? "MAX BUILDINGS REACHED"
            : !ownsCompleteGroup
            ? "OWN COMPLETE GROUP FIRST"
            : !standingOnProperty
            ? "MUST LAND HERE TO BUILD"
            : userMoney < buildCost
            ? "INSUFFICIENT FUNDS"
            : `CONFIRM BUILD · Rs${buildCost.toLocaleString()}`}
        </Button>
        <Button variant="ghost" onClick={close}>CANCEL</Button>
      </ModalShell>
    );
  }'''

assert old_build in text, "Could not find old_build"
text = text.replace(old_build, new_build, 1)

# 5. Update GameScreen props, state, advanceTurn, and resolvePostMovement
old_game_screen_head = '''function GameScreen({
  navigate, onOpenProperty,
  players, setPlayers,
  activePlayerIndex, setActivePlayerIndex,
  turnState, setTurnState,
  playerPositions, setPlayerPositions,
  roundNumber, setRoundNumber,
}: {
  navigate: (screen: Screen) => void;
  onOpenProperty: (prop: PropertyDefinition | SpecialPropertyDefinition) => void;
  players: EnginePlayer[];
  setPlayers: React.Dispatch<React.SetStateAction<EnginePlayer[]>>;
  activePlayerIndex: number;
  setActivePlayerIndex: React.Dispatch<React.SetStateAction<number>>;
  turnState: string;
  setTurnState: React.Dispatch<React.SetStateAction<string>>;
  playerPositions: number[];
  setPlayerPositions: React.Dispatch<React.SetStateAction<number[]>>;
  roundNumber: number;
  setRoundNumber: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedProp, setSelectedProp] = useState<PropertyDefinition | SpecialPropertyDefinition>(CITY_PROPERTIES.bombay);
  const [taxName, setTaxName] = useState<string>("INCOME TAX");'''

new_game_screen_head = '''function GameScreen({
  navigate, onOpenProperty,
  players, setPlayers,
  activePlayerIndex, setActivePlayerIndex,
  turnState, setTurnState,
  playerPositions, setPlayerPositions,
  roundNumber, setRoundNumber,
  isCppConnected = false,
}: {
  navigate: (screen: Screen) => void;
  onOpenProperty: (prop: PropertyDefinition | SpecialPropertyDefinition) => void;
  players: EnginePlayer[];
  setPlayers: React.Dispatch<React.SetStateAction<EnginePlayer[]>>;
  activePlayerIndex: number;
  setActivePlayerIndex: React.Dispatch<React.SetStateAction<number>>;
  turnState: string;
  setTurnState: React.Dispatch<React.SetStateAction<string>>;
  playerPositions: number[];
  setPlayerPositions: React.Dispatch<React.SetStateAction<number[]>>;
  roundNumber: number;
  setRoundNumber: React.Dispatch<React.SetStateAction<number>>;
  isCppConnected?: boolean;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [turnDiceTotal, setTurnDiceTotal] = useState<number | undefined>(undefined);
  const [pendingAdvanceState, setPendingAdvanceState] = useState<GameState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedProp, setSelectedProp] = useState<PropertyDefinition | SpecialPropertyDefinition>(CITY_PROPERTIES.bombay);
  const [taxName, setTaxName] = useState<string>("INCOME TAX");'''

assert old_game_screen_head in text, "Could not find old_game_screen_head"
text = text.replace(old_game_screen_head, new_game_screen_head, 1)

# 6. Update handleSelectSpace, advanceTurn, resolvePostMovement in GameScreen
old_game_screen_methods = '''  const handleSelectSpace = (space: BoardSpaceDefinition) => {
    if (space.type === "city" && space.propertyId) {
      const prop = CITY_PROPERTIES[space.propertyId];
      if (prop) { setSelectedProp(prop); setModal("property"); }
    } else if (space.type === "special" && space.propertyId) {
      const sp = SPECIAL_PROPERTIES[space.propertyId];
      if (sp) { setSelectedProp(sp); setModal("property"); }
    } else if (space.type === "chance") {
      setModal("chance");
    } else if (space.type === "chest") {
      setModal("chest");
    } else if (space.type === "tax") {
      setTaxName(space.name); setModal("tax");
    } else if (space.name === "JAIL") {
      setModal("jail");
    } else if (space.name === "REST HOUSE") {
      setModal("rest");
    }
  };

  /** Schedule the next player's turn after a brief hold. */
  const advanceTurn = (engineState: GameState, holdMs = 1200) => {
    window.setTimeout(() => {
      setActivePlayerIndex(engineState.activePlayerIndex);
      setTurnState("WAITING_FOR_ROLL");
    }, holdMs);
  };

  /** Sync engine state to UI and open the correct modal for the result. */
  const resolvePostMovement = (result: TurnResult, engineState: GameState) => {
    setPlayers(engineState.players);
    setRoundNumber(engineState.roundNumber);

    // Start-crossing toasts
    if (result.startingCapitalAwarded) {
      showToast(`STARTING CAPITAL Rs25,000 AWARDED TO ${engineState.players[result.playerId]?.name?.toUpperCase()}`);
    } else if (result.passStartBonusAwarded) {
      showToast(`+Rs1,500 PASS START BONUS TO ${engineState.players[result.playerId]?.name?.toUpperCase()}`);
    }

    if (result.mustGoToJail) {
      setModal("jail");
      advanceTurn(engineState);
      return;
    }
    if (result.mustGoToRestHouse) {
      setModal("rest");
      advanceTurn(engineState);
      return;
    }
    if (result.eligibleToBuy && result.purchasablePropertyId) {
      const prop = CITY_PROPERTIES[result.purchasablePropertyId] || SPECIAL_PROPERTIES[result.purchasablePropertyId];
      if (prop) {
        setSelectedProp(prop);
        setModal("buy");
        // Turn advance happens in handleBuyResolved
        return;
      }
    }
    if (result.rentPaid && result.rentAmount > 0) {
      const recipient = engineState.players.find((p) => p.id === result.rentRecipientId);
      showToast(`RENT -Rs${result.rentAmount.toLocaleString()} TO ${recipient?.name?.toUpperCase() ?? "OWNER"}`);
    }
    if (result.spaceType === "tax" && result.moneyChange < 0) {
      setTaxName(result.spaceName);
      setModal("tax");
      advanceTurn(engineState);
      return;
    }
    if (result.spaceType === "chance") {
      setModal("chance");
      advanceTurn(engineState);
      return;
    }
    if (result.spaceType === "chest") {
      setModal("chest");
      advanceTurn(engineState);
      return;
    }
    advanceTurn(engineState);
  };'''

new_game_screen_methods = '''  const handleSelectSpace = (space: BoardSpaceDefinition) => {
    setTurnDiceTotal(undefined);
    setPendingAdvanceState(null);
    if (space.type === "city" && space.propertyId) {
      const prop = CITY_PROPERTIES[space.propertyId];
      if (prop) { setSelectedProp(prop); setModal("property"); }
    } else if (space.type === "special" && space.propertyId) {
      const sp = SPECIAL_PROPERTIES[space.propertyId];
      if (sp) { setSelectedProp(sp); setModal("property"); }
    } else if (space.type === "chance") {
      setModal("chance");
    } else if (space.type === "chest") {
      setModal("chest");
    } else if (space.type === "tax") {
      setTaxName(space.name); setModal("tax");
    } else if (space.name === "JAIL") {
      setModal("jail");
    } else if (space.name === "REST HOUSE") {
      setModal("rest");
    }
  };

  /** Schedule the next player's turn after a brief hold. */
  const advanceTurn = (engineState: GameState, holdMs = 1200) => {
    window.setTimeout(() => {
      setActivePlayerIndex(engineState.activePlayerIndex);
      setTurnState("WAITING_FOR_ROLL");
    }, holdMs);
  };

  const handleModalAcknowledged = () => {
    setModal(null);
    if (pendingAdvanceState) {
      const targetState = pendingAdvanceState;
      setPendingAdvanceState(null);
      advanceTurn(targetState, 300);
    }
  };

  /** Sync engine state to UI and open the correct modal for the result. */
  const resolvePostMovement = (result: TurnResult, engineState: GameState) => {
    setPlayers(engineState.players);
    setRoundNumber(engineState.roundNumber);
    setTurnDiceTotal(result.diceTotal);

    // Start-crossing toasts
    if (result.startingCapitalAwarded) {
      showToast(`STARTING CAPITAL Rs25,000 AWARDED TO ${engineState.players[result.playerId]?.name?.toUpperCase()}`);
    } else if (result.passStartBonusAwarded) {
      showToast(`+Rs1,500 PASS START BONUS TO ${engineState.players[result.playerId]?.name?.toUpperCase()}`);
    }

    if (result.mustGoToJail) {
      setPendingAdvanceState(engineState);
      setModal("jail");
      return;
    }
    if (result.mustGoToRestHouse) {
      setPendingAdvanceState(engineState);
      setModal("rest");
      return;
    }
    if (result.eligibleToBuy && result.purchasablePropertyId) {
      const prop = CITY_PROPERTIES[result.purchasablePropertyId] || SPECIAL_PROPERTIES[result.purchasablePropertyId];
      if (prop) {
        setSelectedProp(prop);
        setModal("buy");
        // Turn advance happens in handleBuyResolved
        return;
      }
    }
    if (result.rentPaid && result.rentAmount > 0) {
      const recipient = engineState.players.find((p) => p.id === result.rentRecipientId);
      showToast(`RENT -Rs${result.rentAmount.toLocaleString()} TO ${recipient?.name?.toUpperCase() ?? "OWNER"}`);
    }
    if (result.spaceType === "tax" && result.moneyChange < 0) {
      setTaxName(result.spaceName);
      setPendingAdvanceState(engineState);
      setModal("tax");
      return;
    }
    if (result.spaceType === "chance") {
      setPendingAdvanceState(engineState);
      setModal("chance");
      return;
    }
    if (result.spaceType === "chest") {
      setPendingAdvanceState(engineState);
      setModal("chest");
      return;
    }
    advanceTurn(engineState);
  };'''

assert old_game_screen_methods in text, "Could not find old_game_screen_methods"
text = text.replace(old_game_screen_methods, new_game_screen_methods, 1)

# 7. Update game-topbar and GameModal call in GameScreen
old_game_topbar = '''      <div className="game-topbar">
        <button className="brand-button" onClick={() => navigate("menu")}><Logo compact /></button>
        <div className="turn-count"><small>ROUND</small><strong>{String(roundNumber).padStart(2, "0")}</strong></div>
        <button className="icon-button game-menu" onClick={() => navigate("settings")}><Icon name="gear" /></button>
      </div>'''

new_game_topbar = '''      <div className="game-topbar">
        <button className="brand-button" onClick={() => navigate("menu")}><Logo compact /></button>
        <div className="turn-count"><small>ROUND</small><strong>{String(roundNumber).padStart(2, "0")}</strong></div>
        <div
          className={`engine-badge ${isCppConnected ? "cpp" : "local"}`}
          title={isCppConnected ? "C++ Native Engine Authoritative" : "Local Engine Active"}
          style={{ margin: "0 8px" }}
        >
          <span className="engine-dot" />
          <span>{isCppConnected ? "C++ ENGINE" : "LOCAL"}</span>
        </div>
        <button className="icon-button game-menu" onClick={() => navigate("settings")}><Icon name="gear" /></button>
      </div>'''

assert old_game_topbar in text, "Could not find old_game_topbar"
text = text.replace(old_game_topbar, new_game_topbar, 1)

old_modal_render = '''      {modal && (
        <GameModal
          type={modal}
          close={() => setModal(null)}
          setModal={setModal}
          navigate={navigate}
          selectedProperty={selectedProp}
          taxSpaceName={taxName}
          players={players}
          activePlayerIndex={activePlayerIndex}
          setPlayers={setPlayers}
          onShowToast={showToast}
          onBuyResolved={handleBuyResolved}
        />
      )}'''

new_modal_render = '''      {modal && (
        <GameModal
          type={modal}
          close={handleModalAcknowledged}
          setModal={setModal}
          navigate={navigate}
          selectedProperty={selectedProp}
          taxSpaceName={taxName}
          players={players}
          activePlayerIndex={activePlayerIndex}
          setPlayers={setPlayers}
          onShowToast={showToast}
          onBuyResolved={handleBuyResolved}
          lastDiceTotal={turnDiceTotal}
          onModalAcknowledged={handleModalAcknowledged}
          playerPositions={playerPositions}
        />
      )}'''

assert old_modal_render in text, "Could not find old_modal_render"
text = text.replace(old_modal_render, new_modal_render, 1)

# 8. Update App root: check defaultEngine.isCppConnected() and pass isCppConnected
old_app_root = '''export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [splash, setSplash] = useState(true);
  const [inspectedProp, setInspectedProp] = useState<PropertyDefinition | SpecialPropertyDefinition | null>(null);

  // Setup settings (controlled by host in SetupScreen)
  const [playerCount, setPlayerCount] = useState(4);
  const [startingMoney, setStartingMoney] = useState(25000);
  const [doublesRule, setDoublesRule] = useState(true);

  // Authoritative engine-synced game state
  const [players, setPlayers] = useState<EnginePlayer[]>(initialPlayers);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [turnState, setTurnState] = useState<string>("WAITING_FOR_ROLL");
  const [playerPositions, setPlayerPositions] = useState<number[]>([0, 0, 0, 0]);
  const [roundNumber, setRoundNumber] = useState<number>(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 900);
    return () => window.clearTimeout(timer);
  }, []);'''

new_app_root = '''export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [splash, setSplash] = useState(true);
  const [inspectedProp, setInspectedProp] = useState<PropertyDefinition | SpecialPropertyDefinition | null>(null);

  // Setup settings (controlled by host in SetupScreen)
  const [playerCount, setPlayerCount] = useState(4);
  const [startingMoney, setStartingMoney] = useState(25000);
  const [doublesRule, setDoublesRule] = useState(true);

  // Authoritative engine-synced game state
  const [players, setPlayers] = useState<EnginePlayer[]>(initialPlayers);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [turnState, setTurnState] = useState<string>("WAITING_FOR_ROLL");
  const [playerPositions, setPlayerPositions] = useState<number[]>([0, 0, 0, 0]);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [isCppConnected, setIsCppConnected] = useState<boolean>(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 900);
    defaultEngine.isCppConnected().then((connected) => {
      setIsCppConnected(connected);
    });
    return () => window.clearTimeout(timer);
  }, []);'''

assert old_app_root in text, "Could not find old_app_root"
text = text.replace(old_app_root, new_app_root, 1)

# 9. Pass isCppConnected to GameScreen in App render
old_render_game = '''  if (screen === "game") {
    return (
      <GameScreen
        navigate={setScreen}
        onOpenProperty={handleInspectFromAssets}
        players={players}
        setPlayers={setPlayers}
        activePlayerIndex={activePlayerIndex}
        setActivePlayerIndex={setActivePlayerIndex}
        turnState={turnState}
        setTurnState={setTurnState}
        playerPositions={playerPositions}
        setPlayerPositions={setPlayerPositions}
        roundNumber={roundNumber}
        setRoundNumber={setRoundNumber}
      />
    );
  }'''

new_render_game = '''  if (screen === "game") {
    return (
      <GameScreen
        navigate={setScreen}
        onOpenProperty={handleInspectFromAssets}
        players={players}
        setPlayers={setPlayers}
        activePlayerIndex={activePlayerIndex}
        setActivePlayerIndex={setActivePlayerIndex}
        turnState={turnState}
        setTurnState={setTurnState}
        playerPositions={playerPositions}
        setPlayerPositions={setPlayerPositions}
        roundNumber={roundNumber}
        setRoundNumber={setRoundNumber}
        isCppConnected={isCppConnected}
      />
    );
  }'''

assert old_render_game in text, "Could not find old_render_game"
text = text.replace(old_render_game, new_render_game, 1)

with open('d:/Monopoly/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Successfully patched App.tsx!')
