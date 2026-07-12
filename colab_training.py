import random
import json
import copy

ROWS = 13
COLS = 6
COLORS = 4

def create_empty_board():
    return [[0 for _ in range(COLS)] for _ in range(ROWS)]

def drop_puyo(board, col, rot, main_color, sub_color):
    new_board = copy.deepcopy(board)
    c_main = col
    c_sub = col
    if rot == 1: c_sub = col + 1
    elif rot == 3: c_sub = col - 1

    if c_sub < 0 or c_sub >= COLS: return None

    if rot == 0 or rot == 2:
        bottom_color = main_color if rot == 0 else sub_color
        top_color = sub_color if rot == 0 else main_color
        
        r = ROWS - 1
        while r >= 0 and new_board[r][c_main] != 0:
            r -= 1
        if r < 1: return None
        new_board[r][c_main] = bottom_color
        new_board[r - 1][c_main] = top_color
    else:
        r_main = ROWS - 1
        while r_main >= 0 and new_board[r_main][c_main] != 0:
            r_main -= 1
        r_sub = ROWS - 1
        while r_sub >= 0 and new_board[r_sub][c_sub] != 0:
            r_sub -= 1
        if r_main < 0 or r_sub < 0: return None
        new_board[r_main][c_main] = main_color
        new_board[r_sub][c_sub] = sub_color
        
    return new_board

def resolve_chains(board):
    current_board = copy.deepcopy(board)
    chains = 0
    while True:
        matched = False
        to_remove = [[False]*COLS for _ in range(ROWS)]
        visited = [[False]*COLS for _ in range(ROWS)]
        
        for r in range(ROWS):
            for c in range(COLS):
                if current_board[r][c] != 0 and not visited[r][c]:
                    color = current_board[r][c]
                    queue = [(r, c)]
                    group = [(r, c)]
                    visited[r][c] = True
                    head = 0
                    while head < len(queue):
                        qr, qc = queue[head]
                        head += 1
                        for dr, dc in [(1,0), (-1,0), (0,1), (0,-1)]:
                            nr, nc = qr + dr, qc + dc
                            if 0 <= nr < ROWS and 0 <= nc < COLS:
                                if current_board[nr][nc] == color and not visited[nr][nc]:
                                    visited[nr][nc] = True
                                    queue.append((nr, nc))
                                    group.append((nr, nc))
                    if len(group) >= 4:
                        matched = True
                        for gr, gc in group:
                            to_remove[gr][gc] = True
                            
        if not matched: break
        chains += 1
        
        for c in range(COLS):
            write_r = ROWS - 1
            for r in range(ROWS - 1, -1, -1):
                if not to_remove[r][c] and current_board[r][c] != 0:
                    val = current_board[r][c]
                    current_board[r][c] = 0
                    current_board[write_r][c] = val
                    write_r -= 1
                elif to_remove[r][c]:
                    current_board[r][c] = 0
                    
    return current_board, chains

def evaluate_board(board, chains, weights):
    score = 0
    if chains > 0:
        score += (10 ** chains) * weights['w_chain']
        
    connect2 = 0
    connect3 = 0
    max_height = 0
    
    visited = [[False]*COLS for _ in range(ROWS)]
    
    for c in range(COLS):
        for r in range(ROWS):
            if board[r][c] != 0:
                max_height = max(max_height, ROWS - r)
                break
                
    for r in range(ROWS):
        for c in range(COLS):
            if board[r][c] != 0 and not visited[r][c]:
                color = board[r][c]
                count = 0
                queue = [(r, c)]
                visited[r][c] = True
                head = 0
                while head < len(queue):
                    qr, qc = queue[head]
                    head += 1
                    count += 1
                    for dr, dc in [(1,0), (-1,0), (0,1), (0,-1)]:
                        nr, nc = qr + dr, qc + dc
                        if 0 <= nr < ROWS and 0 <= nc < COLS:
                            if board[nr][nc] == color and not visited[nr][nc]:
                                visited[nr][nc] = True
                                queue.append((nr, nc))
                if count == 2: connect2 += 1
                if count == 3: connect3 += 1
                
    score += connect2 * weights['w_connect2']
    score += connect3 * weights['w_connect3']
    score -= max_height * weights['w_height']
    return score

def think_ai(board, main_color, sub_color, weights):
    best_score = -float('inf')
    best_move = None
    
    for col in range(COLS):
        for rot in range(4):
            dropped = drop_puyo(board, col, rot, main_color, sub_color)
            if dropped:
                new_board, chains = resolve_chains(dropped)
                score = evaluate_board(new_board, chains, weights)
                if score > best_score:
                    best_score = score
                    best_move = {'col': col, 'rot': rot, 'score': score}
    return best_move

def play_game(weights, max_turns=100):
    """ AIが一人プレイをして、スコア（適応度）を返す """
    board = create_empty_board()
    total_chains = 0
    
    for _ in range(max_turns):
        if board[0][2] != 0: # ゲームオーバー
            break
            
        main_color = random.randint(1, COLORS)
        sub_color = random.randint(1, COLORS)
        
        move = think_ai(board, main_color, sub_color, weights)
        if not move:
            break
            
        board = drop_puyo(board, move['col'], move['rot'], main_color, sub_color)
        board, chains = resolve_chains(board)
        
        total_chains += chains
        
    return total_chains

def run_evolution():
    POPULATION_SIZE = 50
    GENERATIONS = 20
    MUTATION_RATE = 0.1
    
    print(f"遺伝的アルゴリズムを開始: {POPULATION_SIZE}個体 x {GENERATIONS}世代")
    
    # 第一世代の初期化（ランダムな重み）
    population = []
    for _ in range(POPULATION_SIZE):
        population.append({
            'w_chain': random.uniform(1, 50),
            'w_connect2': random.uniform(0, 10),
            'w_connect3': random.uniform(0, 20),
            'w_height': random.uniform(0, 10)
        })
        
    best_overall = None
    best_overall_score = -1
        
    for gen in range(GENERATIONS):
        fitness_scores = []
        for ind in population:
            # 各個体ごとに3回ゲームをプレイさせ、平均連鎖数を適応度とする
            score = sum(play_game(ind, max_turns=80) for _ in range(3)) / 3
            fitness_scores.append((score, ind))
            
        # 適応度でソート（降順）
        fitness_scores.sort(key=lambda x: x[0], reverse=True)
        
        best_gen_score = fitness_scores[0][0]
        best_gen_ind = fitness_scores[0][1]
        
        if best_gen_score > best_overall_score:
            best_overall_score = best_gen_score
            best_overall = best_gen_ind
            
        print(f"世代 {gen+1}/{GENERATIONS} - 最高連鎖数スコア: {best_gen_score:.2f}")
        
        # 優秀な個体（上位20%）を親として選択
        top_count = max(2, POPULATION_SIZE // 5)
        parents = [x[1] for x in fitness_scores[:top_count]]
        
        # エリート保存（上位個体はそのまま次世代へ）
        next_gen = parents[:] 
        
        # 交叉（Crossover）と突然変異（Mutation）で残りの個体を生成
        while len(next_gen) < POPULATION_SIZE:
            p1 = random.choice(parents)
            p2 = random.choice(parents)
            
            child = {}
            for key in p1.keys():
                child[key] = p1[key] if random.random() < 0.5 else p2[key]
                if random.random() < MUTATION_RATE:
                    child[key] += random.uniform(-3, 3)
                    child[key] = max(0.1, child[key]) # 負の値にならないようにする
            next_gen.append(child)
            
        population = next_gen
        
    print("\n学習完了！")
    print(f"最強AIの重みパラメータ: {best_overall}")
    
    # JSONとして保存
    with open('best_brain.json', 'w') as f:
        json.dump(best_overall, f, indent=2)
    print("パラメータを best_brain.json に保存しました。")

if __name__ == "__main__":
    run_evolution()
