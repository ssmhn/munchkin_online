import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import type { CombatState, CardDb, GameAction, PlayerState } from '@munchkin/shared';
import { GameCard } from './GameCard';
import { GoldButton } from './GoldButton';

/** Simple client-side condition evaluator for displaying conditional bonuses */
function evalCondition(cond: any, player: PlayerState): boolean {
  if (!cond) return false;
  switch (cond.type) {
    case 'PLAYER_GENDER': return player.gender === cond.gender;
    case 'PLAYER_RACE': return (player.race ?? 'HUMAN') === cond.race;
    case 'PLAYER_CLASS': return player.classes?.includes(cond.class);
    case 'PLAYER_LEVEL': {
      const lvl = player.level;
      if (cond.op === 'gte') return lvl >= cond.value;
      if (cond.op === 'lte') return lvl <= cond.value;
      if (cond.op === 'eq') return lvl === cond.value;
      return false;
    }
    case 'AND': return cond.conditions?.every((c: any) => evalCondition(c, player));
    case 'OR': return cond.conditions?.some((c: any) => evalCondition(c, player));
    case 'NOT': return !evalCondition(cond.condition, player);
    default: return false;
  }
}

function hasWizardAutoEscape(player: PlayerState, cardDb: CardDb | null): boolean {
  return player.statuses?.includes('WIZARD_AUTO_ESCAPE') ?? false;
}

interface Props {
  combat: CombatState;
  cardDb: CardDb | null;
  players: Record<string, { name: string }>;
  isActivePlayer: boolean;
  selfPlayerId?: string;
  onAction: (action: GameAction) => void;
  playerStates?: Record<string, PlayerState>;
}

export function CombatZone({ combat, cardDb, players, isActivePlayer, selfPlayerId, onAction, playerStates }: Props) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const monstersRef = useRef<HTMLDivElement>(null);
  const [helpTarget, setHelpTarget] = useState<string | null>(null);
  const [treasureOffer, setTreasureOffer] = useState(1);
  const [diceResult, setDiceResult] = useState<{ roll: number; needed: number } | null>(null);

  useEffect(() => {
    if (zoneRef.current) {
      gsap.fromTo(zoneRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' });
    }
  }, []);

  useEffect(() => {
    if (monstersRef.current) {
      const monsterEls = monstersRef.current.children;
      gsap.fromTo(monsterEls, { x: -300, rotation: -15, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, ease: 'power3.out', duration: 0.6, stagger: 0.15 });
    }
  }, [combat.monsters.length]);

  // Calculate player total combat power
  const activePlayerState = playerStates?.[combat.activePlayerId];
  const playerLevel = activePlayerState?.level ?? 1;

  // Equipment bonuses
  let equipmentBonus = 0;
  if (activePlayerState && cardDb) {
    const eq = activePlayerState.equipped;
    const equipIds = [eq.head, eq.body, eq.feet, eq.hand1, eq.hand2, eq.twoHands, ...eq.extras].filter(Boolean) as string[];
    equipIds.forEach((id) => {
      const def = cardDb[id];
      if (def?.effects) {
        def.effects.forEach((e: any) => {
          if (e.type === 'COMBAT_BONUS') equipmentBonus += e.value ?? 0;
        });
      }
    });
  }

  // Applied combat card bonuses (one-shots, etc.)
  let appliedBonus = 0;
  combat.appliedCards.forEach((ac) => {
    const def = cardDb?.[ac.cardId];
    if (def?.effects) {
      def.effects.forEach((e: any) => {
        if (e.type === 'COMBAT_BONUS') appliedBonus += e.value ?? 0;
      });
    }
  });

  // Helper bonuses (level + equipment for each helper)
  let helperBonus = 0;
  combat.helpers.forEach((h) => {
    const helperState = playerStates?.[h.playerId];
    if (!helperState) return;
    helperBonus += helperState.level;
    if (cardDb) {
      const heq = helperState.equipped;
      const helperEquipIds = [heq.head, heq.body, heq.feet, heq.hand1, heq.hand2, heq.twoHands, ...heq.extras].filter(Boolean) as string[];
      helperEquipIds.forEach((id) => {
        const def = cardDb[id];
        if (def?.effects) {
          def.effects.forEach((e: any) => {
            if (e.type === 'COMBAT_BONUS') helperBonus += e.value ?? 0;
          });
        }
      });
    }
  });

  // Curse combat penalties
  let cursePenalty = 0;
  if (activePlayerState && cardDb) {
    for (const curse of activePlayerState.curses) {
      const curseDef = cardDb[curse.cardId];
      if (!curseDef) continue;
      for (const e of curseDef.effects) {
        if ((e as any).type === 'COMBAT_BONUS' && (e as any).value < 0) {
          cursePenalty += (e as any).value;
        }
      }
    }
  }

  const playerTotal = Math.max(0, playerLevel + equipmentBonus + appliedBonus + helperBonus + cursePenalty);

  // Calculate monster total (base + modifiers + conditional bonuses + applied cards)
  let monsterTotal = 0;
  combat.monsters.forEach((m) => {
    const def = cardDb?.[m.cardId];
    const base = def?.baseLevel ?? 0;
    const mods = m.modifiers.reduce((sum, mod) => sum + mod.value, 0);
    let conditionalBonus = 0;
    // Evaluate conditional effects on monster (e.g., +2 vs elves)
    if (def?.effects && activePlayerState) {
      def.effects.forEach((e: any) => {
        if (e.type === 'CONDITIONAL' && e.condition && e.then) {
          if (evalCondition(e.condition, activePlayerState)) {
            e.then.forEach((sub: any) => {
              if (sub.type === 'MONSTER_BONUS' || sub.type === 'COMBAT_BONUS') {
                conditionalBonus += sub.value ?? 0;
              }
            });
          }
        }
      });
    }
    monsterTotal += base + mods + conditionalBonus;
  });

  // Applied cards affecting monsters (MONSTER_BONUS / MONSTER_PENALTY)
  combat.appliedCards.forEach((ac) => {
    const def = cardDb?.[ac.cardId];
    if (def?.effects) {
      def.effects.forEach((e: any) => {
        if (e.type === 'MONSTER_BONUS') monsterTotal += e.value ?? 0;
        if (e.type === 'MONSTER_PENALTY') monsterTotal -= e.value ?? 0;
      });
    }
  });

  // Total treasures from all monsters
  let totalTreasures = 0;
  combat.monsters.forEach((m) => {
    const def = cardDb?.[m.cardId];
    totalTreasures += def?.treasures ?? 0;
  });

  // Total levels gained on victory
  let totalLevels = combat.monsters.length;
  combat.appliedCards.forEach((ac) => {
    const def = cardDb?.[ac.cardId];
    if (def?.effects) {
      def.effects.forEach((e: any) => {
        if (e.type === 'GAIN_LEVELS_FROM_KILL') totalLevels += e.value ?? 0;
      });
    }
  });

  // Extra treasures from applied cards
  combat.appliedCards.forEach((ac) => {
    const def = cardDb?.[ac.cardId];
    if (def?.effects) {
      def.effects.forEach((e: any) => {
        if (e.type === 'EXTRA_TREASURE') totalTreasures += e.count ?? 0;
      });
    }
  });

  // Extra treasures from monster modifier cards
  combat.monsters.forEach((m) => {
    m.modifiers.forEach((mod) => {
      const def = cardDb?.[mod.cardId];
      if (def?.effects) {
        def.effects.forEach((e: any) => {
          if (e.type === 'EXTRA_TREASURE') totalTreasures += e.count ?? 0;
        });
      }
    });
  });

  const fighterName = players[combat.activePlayerId]?.name || 'Unknown';
  const otherPlayerIds = Object.keys(players).filter((id) => id !== combat.activePlayerId);
  const isNegotiating = combat.phase === 'NEGOTIATION';
  const helpOffer = combat.helpOffer;

  // Cleric banish undead check
  const allMonstersUndead = cardDb ? combat.monsters.every((m) => {
    const def = cardDb[m.cardId];
    return def?.tags?.includes('UNDEAD');
  }) : false;
  const canBanishUndead = isActivePlayer
    && (activePlayerState?.statuses?.includes('CLERIC_BANISH_UNDEAD') ?? false)
    && allMonstersUndead
    && (activePlayerState?.hand?.length ?? 0) > 0;

  // Am I the target of a help offer?
  const amHelpTarget = helpOffer?.toPlayerId === selfPlayerId;

  return (
    <div
      ref={zoneRef}
      data-testid="combat-zone"
      className="flex flex-col items-center gap-3 w-full max-w-[600px] p-4 rounded-xl border border-red-600/20"
      style={{ background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.08) 0%, transparent 70%)' }}
    >
      {/* Phase badge */}
      <div className="text-[10px] font-bold text-red-600 uppercase tracking-wide px-2.5 py-0.5 rounded bg-red-600/15">
        Combat
      </div>

      {/* VS layout */}
      <div className="flex items-start gap-6 w-full justify-center">
        {/* Player side */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <div className="text-[11px] font-semibold text-green-400">
            {fighterName}
            {combat.helpers.length > 0 &&
              ` + ${combat.helpers.map((h) => players[h.playerId]?.name || '?').join(', ')}`}
          </div>
          <div className="text-2xl font-bold text-green-400 font-fantasy">
            {playerTotal}
          </div>
          <div className="text-[9px] text-green-400/70">
            Lv.{playerLevel}
            {equipmentBonus > 0 && ` +${equipmentBonus} equip`}
            {helperBonus > 0 && ` +${helperBonus} helper`}
            {appliedBonus > 0 && ` +${appliedBonus} bonus`}
            {cursePenalty < 0 && <span className="text-red-400"> {cursePenalty} curse</span>}
          </div>
        </div>

        <div className="text-lg font-bold text-red-600 font-fantasy px-1 pt-4">VS</div>

        {/* Monster side */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <div ref={monstersRef} className="flex gap-2 justify-center flex-wrap">
            {combat.monsters.map((monster) => {
              const def = cardDb?.[monster.cardId];
              return (
                <div
                  key={monster.instanceId}
                  data-testid={`monster-${monster.instanceId}`}
                  className="flex flex-col items-center"
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('application/munchkin-card')) {
                      e.preventDefault();
                      e.currentTarget.classList.add('ring-2', 'ring-red-500');
                    }
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('ring-2', 'ring-red-500');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('ring-2', 'ring-red-500');
                    const raw = e.dataTransfer.getData('application/munchkin-card');
                    if (!raw) return;
                    try {
                      const payload = JSON.parse(raw);
                      onAction({ type: 'PLAY_CARD', cardId: payload.cardId, targetMonsterId: monster.instanceId });
                    } catch { /* ignore */ }
                  }}
                >
                  {def ? (
                    <GameCard card={def} />
                  ) : (
                    <div className="w-[120px] h-[170px] rounded-lg bg-violet-600/[.13] border-2 border-violet-600 flex flex-col items-center justify-center p-2">
                      <div className="text-xs text-violet-400 font-bold text-center">
                        {monster.cardId.replace(/_/g, ' ')}
                      </div>
                    </div>
                  )}
                  {monster.modifiers.length > 0 && (
                    <div className="text-[9px] text-center text-red-400 mt-0.5 font-bold">
                      Mods: {monster.modifiers.map((m) => (m.value >= 0 ? `+${m.value}` : `${m.value}`)).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-2xl font-bold text-red-600 font-fantasy">Lv.{monsterTotal}</div>
          <div className="text-[9px] text-amber-400">
            Treasures: {totalTreasures} | +{totalLevels} level{totalLevels > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Applied cards — player-side buffs */}
      {combat.appliedCards.length > 0 && (
        <div className="w-full">
          <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide mb-1 text-center">
            Played Cards
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {combat.appliedCards.map((ac, i) => {
              const def = cardDb?.[ac.cardId];
              const ownerName = players[ac.playerId]?.name || ac.playerId;
              return (
                <div
                  key={`applied-${ac.cardId}-${i}`}
                  className="flex flex-col items-center"
                >
                  {def ? (
                    <div className="transform scale-75 origin-top">
                      <GameCard card={def} />
                    </div>
                  ) : (
                    <div className="w-[90px] h-[125px] rounded-lg bg-indigo-500/10 border border-indigo-400/25 flex items-center justify-center p-1">
                      <div className="text-[9px] text-indigo-400 font-bold text-center">{ac.cardId.replace(/_/g, ' ')}</div>
                    </div>
                  )}
                  <div className="text-[8px] text-munch-text-muted -mt-4">by {ownerName}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monster modifiers — cards applied to monsters */}
      {combat.monsters.some((m) => m.modifiers.length > 0) && (
        <div className="w-full">
          <div className="text-[9px] font-bold text-red-400 uppercase tracking-wide mb-1 text-center">
            Monster Modifiers
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {combat.monsters.flatMap((m) =>
              m.modifiers.map((mod, mi) => {
                const def = cardDb?.[mod.cardId];
                return (
                  <div
                    key={`mod-${m.instanceId}-${mod.cardId}-${mi}`}
                    className="flex flex-col items-center"
                  >
                    {def ? (
                      <div className="transform scale-75 origin-top">
                        <GameCard card={def} />
                      </div>
                    ) : (
                      <div className="w-[90px] h-[125px] rounded-lg bg-red-500/10 border border-red-400/25 flex items-center justify-center p-1">
                        <div className="text-[9px] text-red-400 font-bold text-center">{mod.cardId.replace(/_/g, ' ')}</div>
                      </div>
                    )}
                    <div className="text-[8px] text-red-400/70 -mt-4">
                      {mod.value >= 0 ? `+${mod.value}` : mod.value}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Helpers */}
      {combat.helpers.length > 0 && (
        <div className="text-[10px] text-green-400">
          Helpers: {combat.helpers.map((h) =>
            `${players[h.playerId]?.name || h.playerId} (${h.agreedTreasureCount} treasures)`
          ).join(', ')}
        </div>
      )}

      {/* Power comparison hint */}
      {combat.phase === 'ACTIVE' && (
        <div className={`text-[10px] font-bold ${playerTotal > monsterTotal ? 'text-green-400' : 'text-red-400'}`}>
          {playerTotal > monsterTotal
            ? 'You are winning! Press Fight to claim victory.'
            : playerTotal === monsterTotal
              ? 'Tie — you will lose! Play cards or ask for help.'
              : 'You are losing! Play cards, ask for help, or press Done to run.'}
        </div>
      )}

      {/* Combat action buttons — for active player */}
      {isActivePlayer && combat.phase === 'ACTIVE' && !helpTarget && (
        <div className="flex gap-2.5 flex-wrap justify-center pt-1 border-t border-red-600/20 w-full">
          <GoldButton
            onClick={() => onAction({ type: 'RESOLVE_COMBAT' })}
            data-testid="btn-fight"
          >
            {playerTotal > monsterTotal ? 'Fight!' : 'Done'}
          </GoldButton>
          {canBanishUndead && (
            <GoldButton
              onClick={() => {
                // Discard first card from hand to banish
                const firstCard = activePlayerState?.hand?.[0];
                if (firstCard) {
                  onAction({ type: 'BANISH_UNDEAD', cardId: firstCard } as GameAction);
                }
              }}
              data-testid="btn-banish"
            >
              Banish Undead
            </GoldButton>
          )}
          {otherPlayerIds.length > 0 && (
            <GoldButton
              onClick={() => setHelpTarget(otherPlayerIds[0])}
              data-testid="btn-ask-help"
            >
              Ask for Help
            </GoldButton>
          )}
        </div>
      )}

      {/* Run attempt phase — player is not strong enough, must roll dice */}
      {combat.phase === 'RUN_ATTEMPT' && (() => {
        const escapingId = combat.escapingPlayerId ?? combat.activePlayerId;
        const escapingName = players[escapingId]?.name || escapingId;
        const isMyTurnToEscape = selfPlayerId === escapingId;
        const escapingPlayerState = playerStates?.[escapingId];
        const escapingIsWizard = escapingPlayerState ? hasWizardAutoEscape(escapingPlayerState, cardDb) : false;

        const monsterIdx = combat.escapeMonsterIndex ?? 0;
        const currentMonster = combat.monsters[monsterIdx];
        const currentMonsterDef = currentMonster ? cardDb?.[currentMonster.cardId] : null;
        const monsterName = currentMonsterDef?.name ?? currentMonster?.cardId.replace(/_/g, ' ') ?? '???';
        const isPrevented = currentMonsterDef?.effects?.some((e: any) => e.type === 'PREVENT_ESCAPE') ?? false;
        const prevResults = combat.escapeResults ?? [];

        return (
          <div className="flex flex-col items-center gap-2 pt-2 border-t border-red-600/20 w-full">
            {/* Who is escaping */}
            <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">
              {escapingName} убегает
            </div>

            {/* Previous escape results */}
            {prevResults.length > 0 && (
              <div className="flex flex-col gap-1 w-full items-center mb-1">
                {prevResults.map((r, ri) => {
                  const m = combat.monsters.find((m) => m.instanceId === r.instanceId);
                  const mDef = m ? cardDb?.[m.cardId] : null;
                  const mName = mDef?.name ?? m?.cardId.replace(/_/g, ' ') ?? '???';
                  const rPlayerName = players[(r as any).playerId]?.name || '';
                  return (
                    <div key={`${r.instanceId}-${ri}`} className={`text-[10px] font-bold ${r.escaped ? 'text-green-400' : 'text-red-400'}`}>
                      {rPlayerName ? `${rPlayerName}: ` : ''}{mName}: {r.prevented ? 'Побег невозможен!' : r.escaped ? `Убежал (${r.roll})` : `Не убежал (${r.roll})`}
                    </div>
                  );
                })}
              </div>
            )}

            {isMyTurnToEscape ? (
              <>
                {escapingIsWizard ? (
                  <>
                    <div className="text-xs text-blue-400 font-bold">
                      Wizard auto-escape! You flee automatically.
                    </div>
                    <GoldButton
                      onClick={() => onAction({ type: 'RUN_AWAY', diceRoll: 6 })}
                      data-testid="btn-auto-escape"
                    >
                      Auto Escape
                    </GoldButton>
                  </>
                ) : (
                  <>
                    {/* Current monster */}
                    <div className="text-xs text-amber-400 font-semibold">
                      Убегаем от: {monsterName} ({monsterIdx + 1}/{combat.monsters.length})
                    </div>

                    {isPrevented ? (
                      <>
                        <div className="text-xs text-red-400 font-bold">
                          Побег невозможен! {monsterName} не даёт убежать.
                        </div>
                        {diceResult ? (
                          <div className="text-sm font-bold text-red-400">
                            Не удалось убежать! Bad Stuff...
                          </div>
                        ) : (
                          <GoldButton
                            variant="danger"
                            onClick={() => {
                              setDiceResult({ roll: 0, needed: 99 });
                              setTimeout(() => {
                                onAction({ type: 'RUN_AWAY', diceRoll: 1 });
                                setDiceResult(null);
                              }, 1500);
                            }}
                            data-testid="btn-cant-escape"
                          >
                            Побег невозможен
                          </GoldButton>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-red-400 font-bold">
                          Брось кубик чтобы убежать (нужно 5+).
                        </div>
                        {diceResult ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className={`text-4xl font-bold font-fantasy ${diceResult.roll >= diceResult.needed ? 'text-green-400' : 'text-red-400'}`}>
                              {diceResult.roll}
                            </div>
                            <div className={`text-sm font-bold ${diceResult.roll >= diceResult.needed ? 'text-green-400' : 'text-red-400'}`}>
                              {diceResult.roll >= diceResult.needed ? 'Убежал!' : 'Не убежал!'}
                            </div>
                          </div>
                        ) : (
                          <GoldButton
                            variant="danger"
                            onClick={() => {
                              const roll = Math.floor(Math.random() * 6) + 1;
                              setDiceResult({ roll, needed: 5 });
                              setTimeout(() => {
                                onAction({ type: 'RUN_AWAY', diceRoll: roll });
                                setDiceResult(null);
                              }, 2000);
                            }}
                            data-testid="btn-run-away"
                          >
                            Бросить кубик
                          </GoldButton>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="text-[10px] text-red-400/70 animate-pulse pt-1">
                {escapingName} бросает кубик...
              </div>
            )}
          </div>
        );
      })()}

      {/* Help offer UI — active player choosing who to ask and treasure count */}
      {isActivePlayer && helpTarget && combat.phase === 'ACTIVE' && (
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-amber-600/20 w-full">
          <div className="text-xs text-munch-gold font-semibold">Ask for Help</div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-munch-text-muted">Player:</span>
            <select
              value={helpTarget}
              onChange={(e) => setHelpTarget(e.target.value)}
              className="text-xs bg-munch-surface border border-munch-border rounded px-2 py-1 text-munch-text"
            >
              {otherPlayerIds.map((id) => (
                <option key={id} value={id}>{players[id]?.name || id}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-munch-text-muted">Treasures offered:</span>
            <input
              type="number"
              min={0}
              max={totalTreasures}
              value={treasureOffer}
              onChange={(e) => setTreasureOffer(Math.max(0, Math.min(totalTreasures, Number(e.target.value))))}
              className="w-12 text-xs text-center bg-munch-surface border border-munch-border rounded px-1 py-1 text-munch-text"
            />
            <span className="text-[10px] text-munch-text-muted">/ {totalTreasures}</span>
          </div>
          <div className="flex gap-2">
            <GoldButton
              onClick={() => {
                onAction({ type: 'OFFER_HELP', targetPlayerId: helpTarget, treasureCount: treasureOffer });
                setHelpTarget(null);
              }}
            >
              Send Offer
            </GoldButton>
            <GoldButton variant="danger" onClick={() => setHelpTarget(null)}>
              Cancel
            </GoldButton>
          </div>
        </div>
      )}

      {/* Negotiation state — pending help offer */}
      {isNegotiating && helpOffer && (
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-amber-600/20 w-full">
          <div className="text-xs text-amber-400 font-semibold">
            {players[helpOffer.fromPlayerId]?.name} offers {players[helpOffer.toPlayerId]?.name} help for {helpOffer.treasureCount} treasure{helpOffer.treasureCount !== 1 ? 's' : ''}
          </div>

          {amHelpTarget && (
            <div className="flex gap-2">
              <GoldButton onClick={() => onAction({ type: 'ACCEPT_HELP' })}>
                Accept
              </GoldButton>
              <GoldButton variant="danger" onClick={() => onAction({ type: 'DECLINE_HELP' })}>
                Decline
              </GoldButton>
            </div>
          )}

          {!amHelpTarget && helpOffer.fromPlayerId === selfPlayerId && (
            <div className="text-[10px] text-munch-text-muted animate-pulse">
              Waiting for response...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
