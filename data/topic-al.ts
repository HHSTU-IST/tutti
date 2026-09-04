const data: import("../types/quiz-bank").QuizBank = {
    "_config": {
        "topicNameMap": {
            "complex": "复杂度分析",
            "array": "数组与字符串",
            "linked": "链表",
            "stack": "栈与队列",
            "tree": "树与二叉树",
            "graph": "图",
            "sort": "排序算法",
            "dp": "动态规划"
        },
        "knowledgeBase": {
            "时间复杂度": "描述算法运行时间随输入规模 n 增长的趋势，只保留最高阶项，忽略常数因子。",
            "空间复杂度": "描述算法所需额外空间随输入规模 n 增长的趋势。",
            "大O记号": "O(f(n)) 表示当 n 足够大时运行时间的渐进上界。",
            "数组": "在内存中连续存储，支持下标随机访问，时间复杂度 O(1)。",
            "哈希表": "通过哈希函数将键映射到桶，平均查找、插入、删除为 O(1)，最坏退化到 O(n)。",
            "双指针": "用两个索引从两端或同向扫描，常用于有序数组的两数之和、去重、滑动窗口。",
            "前缀和": "预处理出累加数组，使任意区间和能在 O(1) 内求出。",
            "链表": "节点通过指针串联，不支持随机访问，插入删除在已知节点时为 O(1)。",
            "快慢指针": "快指针走两步、慢指针走一步，可用于检测环、找中点、找倒数第 k 个节点。",
            "栈": "后进先出 LIFO，常用于括号匹配、表达式求值、函数调用。",
            "队列": "先进先出 FIFO，常用于 BFS、缓冲区。",
            "二叉树": "每个节点最多两个子节点；前序根-左-右、中序左-根-右、后序左-右-根。",
            "二叉搜索树": "左子树均小于根、右子树均大于根，中序遍历为升序，平衡时查找 O(log n)。",
            "完全二叉树": "除最后一层外全满，最后一层从左到右填充；高度为 O(log n)。",
            "图": "由顶点和边组成；邻接表适合稀疏图，邻接矩阵适合稠密图。",
            "DFS": "深度优先搜索，通常用栈或递归实现，可判断连通性、检测环。",
            "BFS": "广度优先搜索，通常用队列实现，可求无权图最短路径。",
            "拓扑排序": "对有向无环图 DAG 排出线性次序，可用于依赖调度。",
            "Dijkstra": "求单源最短路径，要求边权非负，常用最小堆优化到 O((V+E)logV)。",
            "最小生成树": "连接所有顶点且总权最小的树，常用 Prim 和 Kruskal。",
            "冒泡排序": "相邻比较交换，平均与最坏 O(n^2)，稳定。",
            "归并排序": "分治，O(n log n)，稳定，需额外空间。",
            "快速排序": "选基准分区，平均 O(n log n)，最坏 O(n^2)，不稳定。",
            "堆排序": "基于堆，最坏 O(n log n)，不稳定。",
            "稳定排序": "相等元素相对次序不变；归并、插入、冒泡稳定，快排、堆排、选择不稳定。",
            "动态规划": "用于具有最优子结构和重叠子问题的问题，通过状态与转移避免重复计算。",
            "0-1背包": "每个物品只能选或不选，状态常定义为前 i 个物品在容量 w 下的最大价值。",
            "完全背包": "每种物品可重复选取。",
            "LCS": "最长公共子序列，常用二维 DP 求解。",
            "编辑距离": "两个字符串相互转换的最少操作数，常用 DP 求解。",
            "贪心": "每步取局部最优，不一定得到全局最优，需证明正确性。"
        }
    },
    "complex": {
        "single": [
            {
                "question": "时间复杂度主要用于衡量什么？",
                "options": [
                    "算法运行时间随输入规模增长的趋势",
                    "算法占用的内存大小",
                    "代码行数",
                    "编译速度"
                ],
                "answer": 0,
                "difficulty": "易",
                "explain": "时间复杂度描述运行时间随输入规模 n 的增长趋势，而非绝对值。"
            },
            {
                "question": "以下哪项是 O(1) 的典型操作？",
                "options": [
                    "数组按下标随机访问",
                    "在未排序数组中线性查找",
                    "遍历整个数组",
                    "冒泡排序"
                ],
                "answer": 0,
                "difficulty": "易",
                "explain": "数组按下标访问不需要遍历，是常数时间。"
            },
            {
                "question": "一个两层嵌套循环，外层 n 次、内层 n 次，时间复杂度是？",
                "options": ["O(n)", "O(n^2)", "O(log n)", "O(2^n)"],
                "answer": 1,
                "difficulty": "易",
                "explain": "总操作约 n*n，故为 O(n^2)。"
            },
            {
                "question": "二分查找的时间复杂度是？",
                "options": ["O(n)", "O(n^2)", "O(log n)", "O(n log n)"],
                "answer": 2,
                "difficulty": "易",
                "explain": "每次将搜索区间减半，约 log2(n) 步。"
            },
            {
                "question": "空间复杂度 O(n) 表示？",
                "options": [
                    "额外空间随输入规模线性增长",
                    "只使用常数空间",
                    "算法运行时间很长",
                    "算法无法运行"
                ],
                "answer": 0,
                "difficulty": "易",
                "explain": "O(n) 指额外空间与输入规模成正比。"
            },
            {
                "question": "递归计算阶乘 fact(n)=n*fact(n-1) 的时间复杂度是？",
                "options": ["O(n)", "O(n^2)", "O(log n)", "O(1)"],
                "answer": 0,
                "difficulty": "中",
                "explain": "共发生 n 次递归调用，每次常数工作，故 O(n)。"
            },
            {
                "question": "快速排序的平均时间复杂度是？",
                "options": ["O(n)", "O(n^2)", "O(n log n)", "O(log n)"],
                "answer": 2,
                "difficulty": "中",
                "explain": "平均每次划分将区间大致对半，共 log n 层，每层 O(n)。"
            }
        ],
        "judge": [
            {
                "question": "时间复杂度分析只关心最高阶项，常数因子和低位项可以忽略。",
                "answer": true,
                "difficulty": "易",
                "explain": "渐进记号下我们只看随 n 增长最快的项。"
            },
            {
                "question": "所有 O(n^2) 算法在任何输入下都一定比 O(n log n) 算法慢。",
                "answer": false,
                "difficulty": "中",
                "explain": "大O描述渐进趋势，小规模或常数因子较大时不一定。"
            }
        ],
        "fill": [
            {
                "question": "一个算法随输入规模 n 增长需要约 3n+5 次基本操作，其渐进时间复杂度记为 ____。",
                "answer": "O(n)",
                "difficulty": "易",
                "explain": "忽略常数 3 与常数 5，渐进复杂度为 O(n)。"
            },
            {
                "question": "二分查找每轮把区间对半，其时间复杂度为 ____。",
                "answer": "O(log n)",
                "difficulty": "易",
                "explain": "每轮规模减半，最多进行 log₂n 轮。"
            }
        ]
    },
    "array": {
        "single": [
            {
                "question": "在动态数组末尾追加元素（均摊意义下）的时间复杂度是？",
                "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
                "answer": 0,
                "difficulty": "易",
                "explain": "大多数追加是 O(1)，偶尔扩容为 O(n)，均摊后仍为 O(1)。"
            },
            {
                "question": "在数组中间位置插入元素（需移动后续元素）的时间复杂度是？",
                "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
                "answer": 1,
                "difficulty": "易",
                "explain": "最坏需移动约 n 个元素。"
            },
            {
                "question": "用哈希表求解「两数之和」的最优时间复杂度是？",
                "options": ["O(n^2)", "O(n)", "O(log n)", "O(n log n)"],
                "answer": 1,
                "difficulty": "中",
                "explain": "一次遍历，边走边查补数，平均 O(n)。"
            },
            {
                "question": "在有序数组中使用双指针找两数之和的时间复杂度是？",
                "options": ["O(n^2)", "O(n)", "O(log n)", "O(1)"],
                "answer": 1,
                "difficulty": "中",
                "explain": "左右指针各扫描一次，O(n)。"
            },
            {
                "question": "哈希表的平均查找时间复杂度是？",
                "options": ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
                "answer": 2,
                "difficulty": "易",
                "explain": "理想情况下哈希函数均匀，查找为平均 O(1)。"
            },
            {
                "question": "前缀和数组用于快速求区间和，预处理与单次查询的复杂度是？",
                "options": [
                    "预处理 O(n)、查询 O(1)",
                    "预处理 O(1)、查询 O(n)",
                    "均为 O(n)",
                    "均为 O(1)"
                ],
                "answer": 0,
                "difficulty": "中",
                "explain": "先 O(n) 预处理前缀和，区间和用两次相减 O(1) 得到。"
            },
            {
                "question": "原地反转字符串的时间复杂度是？",
                "options": ["O(n)", "O(n^2)", "O(log n)", "O(1)"],
                "answer": 0,
                "difficulty": "易",
                "explain": "双指针从两端向中间交换，约 n/2 次，O(n)。"
            }
        ],
        "judge": [
            {
                "question": "数组在内存中连续存储，因此支持按下标的随机访问。",
                "answer": true,
                "difficulty": "易",
                "explain": "连续存储使下标访问可直接计算地址，O(1)。"
            },
            {
                "question": "哈希表一定能保证最坏情况 O(1) 的查找。",
                "answer": false,
                "difficulty": "中",
                "explain": "哈希冲突严重时最坏退化为 O(n)，需用良好哈希与扩容缓解。"
            }
        ],
        "fill": [
            {
                "question": "给定一个整数数组，用 ____ 数据结构可以在平均 O(1) 时间内判断某个元素是否出现过。",
                "answer": "哈希表",
                "difficulty": "易",
                "explain": "哈希表以元素值为键，查找/插入平均 O(1)。"
            }
        ]
    },
    "linked": {
        "single": [
            {
                "question": "单链表节点通常包含？",
                "options": [
                    "数据域和指向下一节点的指针",
                    "仅数据域",
                    "数据域和前驱指针",
                    "数组下标"
                ],
                "answer": 0,
                "difficulty": "易",
                "explain": "单链表节点保存数据与 next 指针。"
            },
            {
                "question": "在已知节点之后插入新节点，时间复杂度是？",
                "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
                "answer": 0,
                "difficulty": "易",
                "explain": "已知节点时只需改两个指针，O(1)。"
            },
            {
                "question": "删除单链表头节点，时间复杂度是？",
                "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
                "answer": 0,
                "difficulty": "易",
                "explain": "头删只需将 head 指向第二个节点。"
            },
            {
                "question": "判断单链表是否存在环，常用？",
                "options": ["快慢指针", "冒泡排序", "二分查找", "哈希加密"],
                "answer": 0,
                "difficulty": "中",
                "explain": "快慢指针相遇说明有环。"
            },
            {
                "question": "反转单链表的时间与空间复杂度通常是？",
                "options": [
                    "O(n) 时间、O(1) 空间",
                    "O(n) 时间、O(n) 空间",
                    "O(1) 时间、O(n) 空间",
                    "O(n^2) 时间"
                ],
                "answer": 0,
                "difficulty": "中",
                "explain": "迭代反转只需改变指针，O(n) 时间、常数额外空间。"
            },
            {
                "question": "双向链表相比单链表的主要优势是？",
                "options": [
                    "可双向遍历、删除给定节点更快",
                    "占用更少内存",
                    "支持随机访问",
                    "插入速度更快"
                ],
                "answer": 0,
                "difficulty": "中",
                "explain": "双向链表有前驱指针，已知节点可 O(1) 删除。"
            },
            {
                "question": "查找单链表倒数第 k 个节点可用？",
                "options": ["前后相距 k 的双指针", "堆排序", "单独栈", "单独队列"],
                "answer": 0,
                "difficulty": "中",
                "explain": "快指针先走 k 步，再同步前进，快指针到尾时慢指针即目标。"
            }
        ],
        "judge": [
            {
                "question": "链表不支持随机访问，访问第 k 个元素需要从头遍历。",
                "answer": true,
                "difficulty": "易",
                "explain": "链表靠指针串联，必须顺序访问。"
            },
            {
                "question": "单链表每个节点都同时保存了指向前驱和后继的指针。",
                "answer": false,
                "difficulty": "易",
                "explain": "这是双向链表的特征，单链表只有 next 指针。"
            }
        ],
        "fill": [
            {
                "question": "用 ____ 指针法（快指针走两步、慢指针走一步）可以检测链表中是否存在环。",
                "answer": "快慢",
                "difficulty": "中",
                "explain": "快慢指针若相遇则说明有环。"
            },
            {
                "question": "在单链表中删除某个节点，需要修改其 ____ 节点的 next 指针。",
                "answer": "前驱",
                "difficulty": "中",
                "explain": "单链表只能单向遍历，必须借助前驱节点完成摘链。"
            }
        ]
    },
    "stack": {
        "single": [
            {
                "question": "栈的基本特性是？",
                "options": ["后进先出 LIFO", "先进先出 FIFO", "随机访问", "有序数组"],
                "answer": 0,
                "difficulty": "易",
                "explain": "栈只能在栈顶操作，后进先出。"
            },
            {
                "question": "队列的基本特性是？",
                "options": ["先进先出 FIFO", "后进先出 LIFO", "随机访问", "二叉树"],
                "answer": 0,
                "difficulty": "易",
                "explain": "队列从队尾入、队首出，先进先出。"
            },
            {
                "question": "用栈实现括号匹配时，遇到右括号应当？",
                "options": ["弹出栈顶看是否匹配", "直接入栈", "清空栈", "报错退出"],
                "answer": 0,
                "difficulty": "易",
                "explain": "右括号应与最近未匹配的左括号配对，即栈顶。"
            },
            {
                "question": "函数调用栈利用的是？",
                "options": ["栈的后进先出", "队列的先进先出", "哈希表", "堆"],
                "answer": 0,
                "difficulty": "易",
                "explain": "函数返回顺序与调用顺序相反，符合 LIFO。"
            },
            {
                "question": "用两个栈可以模拟实现？",
                "options": ["队列", "数组", "单链表", "二叉树"],
                "answer": 0,
                "difficulty": "中",
                "explain": "一个栈负责入队，另一个负责出队可模拟队列。"
            },
            {
                "question": "广度优先搜索 BFS 通常使用？",
                "options": ["队列", "栈", "哈希表", "堆"],
                "answer": 0,
                "difficulty": "易",
                "explain": "BFS 按层扩展，用队列保存待访问节点。"
            },
            {
                "question": "深度优先搜索 DFS 通常使用？",
                "options": ["栈（或递归）", "队列", "哈希表", "堆"],
                "answer": 0,
                "difficulty": "易",
                "explain": "递归本质用调用栈，也可用显式栈实现 DFS。"
            }
        ],
        "judge": [
            {
                "question": "栈和队列都只能在端点进行插入与删除操作。",
                "answer": true,
                "difficulty": "易",
                "explain": "栈在栈顶、队列在队尾入队首出，均限定端点。"
            },
            {
                "question": "用堆实现的优先队列能保证每次出队的是当前最小（或最大）元素。",
                "answer": true,
                "difficulty": "中",
                "explain": "优先队列（最小/最大堆）出队最优元素为 O(log n)。"
            }
        ],
        "fill": [
            {
                "question": "在表达式求值中，常借助 ____ 来暂存运算符并处理优先级。",
                "answer": "栈",
                "difficulty": "中",
                "explain": "栈可延迟处理低优先级运算符，实现中缀转后缀与求值。"
            }
        ]
    },
    "tree": {
        "single": [
            {
                "question": "满二叉树中，第 i 层最多有？",
                "options": ["2^(i-1) 个节点", "i 个节点", "2^i 个节点", "2i 个节点"],
                "answer": 0,
                "difficulty": "易",
                "explain": "每层节点数随层数指数增长。"
            },
            {
                "question": "含 n 个节点的完全二叉树高度约为？",
                "options": ["⌈log2(n+1)⌉", "n", "n/2", "2n"],
                "answer": 0,
                "difficulty": "中",
                "explain": "完全二叉树高度与节点数呈对数关系。"
            },
            {
                "question": "二叉树的前序遍历顺序是？",
                "options": ["根-左-右", "左-根-右", "左-右-根", "右-左-根"],
                "answer": 0,
                "difficulty": "易",
                "explain": "前序：先访问根，再左子树，再右子树。"
            },
            {
                "question": "二叉树的中序遍历顺序是？",
                "options": ["根-左-右", "左-根-右", "左-右-根", "右-左-根"],
                "answer": 1,
                "difficulty": "易",
                "explain": "中序：先左子树，再根，再右子树。"
            },
            {
                "question": "二叉树的层序遍历通常用？",
                "options": ["队列", "栈", "哈希表", "堆"],
                "answer": 0,
                "difficulty": "易",
                "explain": "层序按层访问，用队列实现。"
            },
            {
                "question": "二叉搜索树 BST 的核心性质是？",
                "options": [
                    "左子树均小于根、右子树均大于根",
                    "完全平衡",
                    "所有节点等深",
                    "节点随机排列"
                ],
                "answer": 0,
                "difficulty": "中",
                "explain": "BST 左小右大，便于查找与维持有序。"
            },
            {
                "question": "在平衡的 BST 中查找元素的平均时间复杂度是？",
                "options": ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
                "answer": 1,
                "difficulty": "中",
                "explain": "平衡时树高为 O(log n)，查找沿一条路径下行。"
            },
            {
                "question": "平衡二叉树（如 AVL）插入后通过旋转保持？",
                "options": [
                    "左右子树高度差不超过 1",
                    "节点数为 2 的幂",
                    "完全满二叉树",
                    "根节点最小"
                ],
                "answer": 0,
                "difficulty": "难",
                "explain": "AVL 要求任意节点左右子树高度差不超过 1。"
            }
        ],
        "judge": [
            {
                "question": "二叉搜索树的中序遍历结果是按关键字升序排列的。",
                "answer": true,
                "difficulty": "中",
                "explain": "BST 左小右大，中序遍历恰好升序。"
            },
            {
                "question": "完全二叉树一定是满二叉树。",
                "answer": false,
                "difficulty": "易",
                "explain": "满二叉树要求每一层都全满；完全二叉树最后一层可不满。"
            }
        ],
        "fill": [
            {
                "question": "在二叉搜索树中，____ 遍历（左-根-右）能得到升序序列。",
                "answer": "中序",
                "difficulty": "易",
                "explain": "BST 中序遍历结果为升序。"
            }
        ]
    },
    "graph": {
        "single": [
            {
                "question": "无向图中的边 (u, v) 与 (v, u) 是否相同？",
                "options": ["相同", "不同", "取决于权重", "总是不同"],
                "answer": 0,
                "difficulty": "易",
                "explain": "无向边没有方向，两端等价。"
            },
            {
                "question": "邻接表相比邻接矩阵的主要空间优势体现在？",
                "options": ["稀疏图更省空间", "稠密图更省", "两者相同", "不能表示无向图"],
                "answer": 0,
                "difficulty": "中",
                "explain": "邻接表只存实际边，稀疏图空间 O(V+E)。"
            },
            {
                "question": "判断图中两点是否连通可用？",
                "options": ["DFS 或 BFS", "二分查找", "冒泡排序", "堆排序"],
                "answer": 0,
                "difficulty": "易",
                "explain": "从一点出发遍历，能到达另一点即连通。"
            },
            {
                "question": "拓扑排序适用于？",
                "options": ["有向无环图 DAG", "无向图", "完全图", "任意图"],
                "answer": 0,
                "difficulty": "中",
                "explain": "拓扑排序要求无环，否则无法排出全序。"
            },
            {
                "question": "Dijkstra 算法要求？",
                "options": ["边权非负", "可以有负权", "必须是无向图", "图必须连通"],
                "answer": 0,
                "difficulty": "中",
                "explain": "Dijkstra 依赖贪心选最小距离，负权会破坏正确性。"
            },
            {
                "question": "求最小生成树常用？",
                "options": ["Prim / Kruskal", "Dijkstra", "拓扑排序", "快速排序"],
                "answer": 0,
                "difficulty": "中",
                "explain": "Prim 与 Kruskal 是经典 MST 算法。"
            },
            {
                "question": "检测有向图是否存在环可用？",
                "options": ["拓扑排序或 DFS 三色标记", "二分查找", "堆", "仅队列"],
                "answer": 0,
                "difficulty": "难",
                "explain": "DFS 着色发现回边即有环；拓扑排序失败也说明有环。"
            }
        ],
        "judge": [
            {
                "question": "广度优先搜索可以用于求无权图的最短路径。",
                "answer": true,
                "difficulty": "中",
                "explain": "BFS 首次到达某点即为最短步数。"
            },
            {
                "question": "Dijkstra 算法可以正确处理含有负权边的图。",
                "answer": false,
                "difficulty": "难",
                "explain": "负权边会使 Dijkstra 的贪心策略失效，应使用 Bellman-Ford。"
            }
        ],
        "fill": [
            {
                "question": "用 ____ 堆（优先队列）实现的 Dijkstra 每次选出当前距离最小的节点。",
                "answer": "最小",
                "difficulty": "中",
                "explain": "最小堆可在 O(log V) 内取出最小距离节点。"
            }
        ]
    },
    "sort": {
        "single": [
            {
                "question": "冒泡排序的平均时间复杂度是？",
                "options": ["O(n^2)", "O(n)", "O(n log n)", "O(log n)"],
                "answer": 0,
                "difficulty": "易",
                "explain": "冒泡需多层扫描，约 n^2/2 次比较。"
            },
            {
                "question": "归并排序的时间复杂度与稳定性是？",
                "options": ["O(n log n) 且稳定", "O(n^2) 且稳定", "O(n log n) 且不稳定", "O(n) 且不稳定"],
                "answer": 0,
                "difficulty": "中",
                "explain": "归并分治 O(n log n)，合并时相等元素不乱序，稳定。"
            },
            {
                "question": "快速排序的平均时间复杂度是？",
                "options": ["O(n log n)", "O(n^2)", "O(n)", "O(log n)"],
                "answer": 0,
                "difficulty": "中",
                "explain": "平均每次分区将区间大致对半。"
            },
            {
                "question": "堆排序的最坏时间复杂度是？",
                "options": ["O(n log n)", "O(n^2)", "O(n)", "O(log n)"],
                "answer": 0,
                "difficulty": "中",
                "explain": "建堆 O(n)，每次取堆顶并调整 O(log n)，共 n 次。"
            },
            {
                "question": "下列哪种排序是稳定的？",
                "options": ["归并排序", "快速排序", "堆排序", "选择排序"],
                "answer": 0,
                "difficulty": "中",
                "explain": "归并、插入、冒泡稳定；快排、堆排、选择不稳定。"
            },
            {
                "question": "计数排序、桶排序、基数排序属于？",
                "options": ["非比较排序", "比较排序", "只用于字符串", "都不稳定"],
                "answer": 0,
                "difficulty": "难",
                "explain": "它们利用数据分布而非两两比较，可突破比较排序下界。"
            },
            {
                "question": "在近乎有序的数组上，下列哪种简单排序表现最好？",
                "options": ["插入排序", "快速排序", "堆排序", "归并排序"],
                "answer": 0,
                "difficulty": "难",
                "explain": "插入排序在基本有序时接近 O(n)。"
            }
        ],
        "judge": [
            {
                "question": "快速排序在最坏情况下（已排序且总选首元素为基准）时间复杂度为 O(n^2)。",
                "answer": true,
                "difficulty": "中",
                "explain": "每次分区极不平衡，退化为 O(n^2)。"
            },
            {
                "question": "任何基于比较的排序算法，其最坏时间复杂度下界都是 Ω(n log n)。",
                "answer": true,
                "difficulty": "难",
                "explain": "比较排序的决策树高度至少为 log(n!)，即 Ω(n log n)。"
            }
        ],
        "fill": [
            {
                "question": "归并排序采用 ____ 策略，将数组不断二分再合并。",
                "answer": "分治",
                "difficulty": "中",
                "explain": "分治把大问题拆成小问题再合并结果。"
            },
            {
                "question": "堆排序与归并排序在最坏情况下的时间复杂度都是 ____。",
                "answer": "O(n log n)",
                "difficulty": "中",
                "explain": "两者最坏情况都能保持 n log n，不像快排会退化到 O(n²)。"
            }
        ]
    },
    "dp": {
        "single": [
            {
                "question": "动态规划适用于具有哪两个性质的问题？",
                "options": [
                    "最优子结构与重叠子问题",
                    "贪心选择与无后效性",
                    "只求最大不求最小",
                    "必须是图结构"
                ],
                "answer": 0,
                "difficulty": "中",
                "explain": "DP 核心是最优子结构和重叠子问题。"
            },
            {
                "question": "0-1 背包问题中，每个物品？",
                "options": ["只能选或不选一次", "可无限选取", "必须选取", "只能选一半"],
                "answer": 0,
                "difficulty": "中",
                "explain": "0-1 背包每个物品至多选一次。"
            },
            {
                "question": "最长公共子序列 LCS 通常用什么方法求解？",
                "options": ["动态规划", "贪心", "分治", "暴力枚举"],
                "answer": 0,
                "difficulty": "中",
                "explain": "LCS 用二维 DP 表递推。"
            },
            {
                "question": "编辑距离（最小操作数）通常用？",
                "options": ["动态规划", "贪心", "拓扑排序", "二分查找"],
                "answer": 0,
                "difficulty": "中",
                "explain": "两字符串对齐问题常用 DP。"
            },
            {
                "question": "DP 状态转移方程的主要作用是？",
                "options": [
                    "描述大问题如何由小问题组合",
                    "用于排序",
                    "用于建图",
                    "用于加密"
                ],
                "answer": 0,
                "difficulty": "易",
                "explain": "转移方程刻画子问题之间的关系。"
            },
            {
                "question": "计算斐波那契时引入记忆化搜索是为了？",
                "options": [
                    "避免重复计算重叠子问题",
                    "增大时间开销",
                    "把空间降到 O(1)",
                    "变成贪心算法"
                ],
                "answer": 0,
                "difficulty": "易",
                "explain": "记忆化缓存已算结果，避免指数级重复。"
            },
            {
                "question": "完全背包与 0-1 背包的主要区别在于？",
                "options": ["物品可重复选取", "物品必须选一个", "两者无差别", "物品必须有序"],
                "answer": 0,
                "difficulty": "中",
                "explain": "完全背包每种物品数量不限。"
            }
        ],
        "judge": [
            {
                "question": "动态规划和分治都要求问题可分解为子问题，但 DP 强调子问题重叠。",
                "answer": true,
                "difficulty": "中",
                "explain": "分治子问题通常不重叠，DP 通过缓存重叠子问题提效。"
            },
            {
                "question": "贪心算法一定能得到动态规划所能得到的最优解。",
                "answer": false,
                "difficulty": "中",
                "explain": "贪心仅在具贪心选择性质时最优，否则可能错过全局最优。"
            }
        ],
        "fill": [
            {
                "question": "0-1 背包的状态常定义为 dp[i][w] 表示前 i 个物品在容量 w 下的 ____ 价值。",
                "answer": "最大",
                "difficulty": "中",
                "explain": "DP 求的是在容量限制下能取得的最大总价值。"
            },
            {
                "question": "能用动态规划求解的问题，需要同时具备最优子结构和 ____ 两个性质。",
                "answer": "子问题重叠",
                "difficulty": "难",
                "explain": "重叠子问题使得记忆化/递推能避免重复计算，是 DP 优于暴力的前提。"
            }
        ]
    }
};

export = data;
