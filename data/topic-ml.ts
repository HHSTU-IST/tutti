const data: import("../types/quiz-bank").QuizBank = {
    "_config": {
        "topicNameMap": {
            "base": "基础概念",
            "reg": "回归算法",
            "classify": "分类算法",
            "cluster": "聚类降维",
            "overfit": "过拟合与优化",
            "tree": "决策树与集成",
            "rl": "强化学习",
            "calc": "计算题",
            "combined": "综合题"
        },
        "knowledgeBase": {
            "机器学习": "人工智能核心，从数据学习规律，分监督、无监督、强化学习。",
            "监督学习": "带标签数据，学输入输出映射，分分类、回归。",
            "无监督学习": "无标签数据，挖结构，聚类、降维。",
            "线性回归": "拟合直线，预测连续值。",
            "逻辑回归": "二分类算法，用Sigmoid输出概率。",
            "过拟合": "训练好，测试差，加正则、扩数据解决。",
            "欠拟合": "模型太简单，都学不好。",
            "正则化": "加惩罚项，抑制过拟合。",
            "梯度下降": "最小化损失的优化算法。",
            "KMeans": "无监督聚类，指定K值。",
            "PCA": "主成分分析，降维。",
            "决策树": "树状决策模型，可分类可回归，可解释性强。",
            "信息熵": "衡量数据纯度，熵越小越纯。",
            "信息增益": "特征带来的熵减，越大越好。",
            "ID3": "用信息增益划分特征的决策树。",
            "C4.5": "用信息增益比，解决ID3偏好多值特征。",
            "CART": "二叉树，用基尼系数/均方误差划分。",
            "基尼系数": "CART分类树纯度指标。",
            "剪枝": "预剪枝/后剪枝，防止决策树过拟合。",
            "集成学习": "组合多个基模型提升效果，分Bagging、Boosting、Stacking。",
            "Bagging": "并行训练，独立采样，降低方差。",
            "随机森林": "Bagging+决策树，抗过拟合强。",
            "Boosting": "串行训练，修正前模型误差。",
            "AdaBoost": "加权修正错误样本。",
            "GBDT": "梯度提升决策树，拟合负梯度。",
            "XGBoost": "高效GBDT，加正则，并行优化。",
            "LightGBM": "基于直方图，速度更快，内存更小。",
            "Stacking": "多层模型堆叠，用基模型输出训练元模型。",
            "强化学习": "智能体通过与环境交互，试错获得奖励，学习最优策略。",
            "智能体": "强化学习中的决策者、行动者。",
            "环境": "智能体交互的外部世界，给出状态和奖励。",
            "状态": "环境当前的情况描述。",
            "动作": "智能体在某状态下做出的行为。",
            "奖励": "环境对动作的即时反馈，正奖励=好，负奖励=差。",
            "策略": "状态到动作的映射，决定怎么选动作。",
            "价值函数": "长期累积奖励的预测，衡量状态好坏。",
            "马尔可夫性": "下一个状态只依赖当前状态，与历史无关。",
            "Q学习": "经典无模型强化学习算法，学习动作价值Q。",
            "探索与利用": "探索=试新动作，利用=选已知最优动作，需平衡。",
            "朴素贝叶斯": "基于贝叶斯定理+条件独立假设的分类算法，简单高效。",
            "贝叶斯公式": "P(Y|X)=P(X|Y)P(Y)/P(X)，后验=似然×先验/证据。",
            "拉普拉斯平滑": "防止概率为0，分子+1，分母+类别数。",
            "西瓜书数据集": "机器学习经典数据集，包含色泽、根蒂、敲声、纹理等特征。",
            "信息增益计算": "熵(D)-熵(D|a)，越大越适合做划分特征。",
            "AGNES": "自底向上层次聚类算法，初始每个样本为一类，不断合并最相似类。",
            "SVM": "支持向量机，寻找最优分类超平面，最大化间隔，适用于分类任务。"
        }
    },
    "base": {
        "single": [
            {
                "question": "下列哪一项不属于机器学习的三大类别？",
                "difficulty": "易",
                "options": [
                    "监督",
                    "无监督",
                    "深度学习",
                    "强化"
                ],
                "answer": 2,
                "explain": "三大类：监督、无监督、强化。"
            },
            {
                "question": "监督学习通常需要什么类型的数据？",
                "difficulty": "易",
                "options": [
                    "标签数据",
                    "无标签",
                    "仅图像",
                    "仅文本"
                ],
                "answer": 0,
                "explain": "监督学习必须带标签。"
            },
            {
                "question": "下列哪一项属于无监督学习任务？",
                "difficulty": "易",
                "options": [
                    "房价预测",
                    "用户分群",
                    "识别垃圾邮件",
                    "诊断"
                ],
                "answer": 1,
                "explain": "聚类是无监督。"
            },
            {
                "question": "回归任务的输出通常是什么？",
                "difficulty": "易",
                "options": [
                    "类别",
                    "连续值",
                    "字符串",
                    "集合"
                ],
                "answer": 1,
                "explain": "回归预测连续数值。"
            },
            {
                "question": "下列哪一项属于监督学习任务？",
                "difficulty": "易",
                "options": [
                    "聚类",
                    "降维",
                    "分类",
                    "特征分组"
                ],
                "answer": 2,
                "explain": "分类是监督学习。"
            },
            {
                "question": "人工智能通过试错和奖励进行学习属于哪一类方法？",
                "difficulty": "易",
                "options": [
                    "监督",
                    "无监督",
                    "强化",
                    "迁移"
                ],
                "answer": 2,
                "explain": "强化学习试错得奖励。"
            },
            {
                "question": "机器学习的主要目的是什么？",
                "difficulty": "易",
                "options": [
                    "手动规则",
                    "从数据学规律",
                    "固定流程",
                    "纯数学计算"
                ],
                "answer": 1,
                "explain": "从数据自动学习。"
            },
            {
                "question": "在机器学习中，“标签”通常指什么？",
                "difficulty": "易",
                "options": [
                    "特征",
                    "标准答案",
                    "参数",
                    "损失"
                ],
                "answer": 1,
                "explain": "标签是训练的标准答案。"
            },
            {
                "question": "下列哪一项不属于机器学习的典型应用？",
                "difficulty": "易",
                "options": [
                    "人脸识别",
                    "计算器",
                    "推荐",
                    "翻译"
                ],
                "answer": 1,
                "explain": "计算器是固定程序。"
            },
            {
                "question": "在机器学习中，数据特征通常指什么？",
                "difficulty": "易",
                "options": [
                    "输入信息",
                    "输出结果",
                    "损失",
                    "参数"
                ],
                "answer": 0,
                "explain": "特征是模型输入。"
            },
            {
                "question": "监督学习通常可以分为哪两类？",
                "difficulty": "易",
                "options": [
                    "聚类降维",
                    "分类回归",
                    "强化迁移",
                    "网络树模型"
                ],
                "answer": 1,
                "explain": "监督=分类+回归。"
            }
        ],
        "judge": [
            {
                "question": "机器学习需要人为写死所有规则。",
                "difficulty": "易",
                "answer": false,
                "explain": "自动学习，不用硬编码。"
            },
            {
                "question": "无监督学习不需要标签数据。",
                "difficulty": "易",
                "answer": true,
                "explain": "无监督自学习结构。"
            },
            {
                "question": "分类任务的输出通常是连续值。",
                "difficulty": "易",
                "answer": false,
                "explain": "分类输出离散类别。"
            },
            {
                "question": "回归任务的输出通常是离散类别。",
                "difficulty": "易",
                "answer": false,
                "explain": "回归输出连续值。"
            },
            {
                "question": "监督学习必须有标签。",
                "difficulty": "易",
                "answer": true,
                "explain": "监督学习核心是标签。"
            },
            {
                "question": "强化学习主要依靠奖励信号进行学习。",
                "difficulty": "易",
                "answer": true,
                "explain": "奖励驱动策略优化。"
            },
            {
                "question": "聚类属于监督学习。",
                "difficulty": "易",
                "answer": false,
                "explain": "聚类是无监督。"
            },
            {
                "question": "推荐系统通常会使用机器学习方法。",
                "difficulty": "易",
                "answer": true,
                "explain": "推荐是典型应用。"
            },
            {
                "question": "在机器学习中，特征等于标签。",
                "difficulty": "易",
                "answer": false,
                "explain": "特征输入，标签输出。"
            },
            {
                "question": "所有人工智能系统都属于机器学习。",
                "difficulty": "易",
                "answer": false,
                "explain": "规则AI不属于ML。"
            }
        ],
        "fill": [
            {
                "question": "机器学习的目标是从数据中学习____。",
                "difficulty": "中",
                "answer": "规律"
            },
            {
                "question": "若训练数据同时包含输入和标准答案，这类学习称为____学习。",
                "difficulty": "中",
                "answer": "监督"
            },
            {
                "question": "无监督学习处理的是____数据。",
                "difficulty": "中",
                "answer": "无标签"
            },
            {
                "question": "分类任务输出的是____标签。",
                "difficulty": "中",
                "answer": "离散"
            },
            {
                "question": "训练样本中的输入称为____。",
                "difficulty": "中",
                "answer": "特征"
            },
            {
                "question": "若模型输出为连续数值而不是类别，则该任务属于____。",
                "difficulty": "中",
                "answer": "回归"
            },
            {
                "question": "监督学习主要分为分类和____。",
                "difficulty": "中",
                "answer": "回归"
            },
            {
                "question": "无监督学习常见任务有聚类和____。",
                "difficulty": "中",
                "answer": "降维"
            },
            {
                "question": "强化学习通过与环境____学习。",
                "difficulty": "中",
                "answer": "交互"
            },
            {
                "question": "模型训练的核心目标之一是最小化____。",
                "difficulty": "中",
                "answer": "损失"
            },
            {
                "question": "测试集用于评估模型的____能力。",
                "difficulty": "中",
                "answer": "泛化"
            },
            {
                "question": "推荐系统是机器学习的典型____。",
                "difficulty": "中",
                "answer": "应用"
            },
            {
                "question": "过拟合说明模型记住了训练数据中的____。",
                "difficulty": "中",
                "answer": "噪声"
            },
            {
                "question": "欠拟合说明模型连数据中的____都没有学到。",
                "difficulty": "中",
                "answer": "规律"
            },
            {
                "question": "机器学习中的三大范式之一是____学习。",
                "difficulty": "中",
                "answer": "强化"
            },
            {
                "question": "如果数据没有标签但希望自动发现结构，这属于____学习。",
                "difficulty": "中",
                "answer": "无监督"
            },
            {
                "question": "模型输入变量通常称为____。",
                "difficulty": "中",
                "answer": "特征"
            },
            {
                "question": "样本通常由特征和____组成。",
                "difficulty": "中",
                "answer": "标签"
            }
        ]
    },
    "reg": {
        "single": [
            {
                "question": "线性回归属于哪一类算法？",
                "difficulty": "中",
                "options": [
                    "分类",
                    "回归",
                    "聚类",
                    "降维"
                ],
                "answer": 1,
                "explain": "线性回归是回归算法。"
            },
            {
                "question": "线性回归通常用于预测什么类型的结果？",
                "difficulty": "中",
                "options": [
                    "类别",
                    "连续值",
                    "文本",
                    "图像"
                ],
                "answer": 1,
                "explain": "预测连续数值。"
            },
            {
                "question": "线性回归模型通常是什么形式？",
                "difficulty": "中",
                "options": [
                    "曲线",
                    "直线",
                    "椭圆",
                    "抛物"
                ],
                "answer": 1,
                "explain": "基础线性回归是直线。"
            },
            {
                "question": "线性回归中常用的损失函数是什么？",
                "difficulty": "中",
                "options": [
                    "交叉熵",
                    "MSE",
                    "准确率",
                    "精确率"
                ],
                "answer": 1,
                "explain": "回归用MSE均方误差。"
            },
            {
                "question": "MSE 指的是什么？",
                "difficulty": "中",
                "options": [
                    "损失",
                    "评价",
                    "特征",
                    "优化器"
                ],
                "answer": 0,
                "explain": "均方误差是损失函数。"
            },
            {
                "question": "线性回归的拟合目标是什么？",
                "difficulty": "中",
                "options": [
                    "最小误差",
                    "最大误差",
                    "固定误差",
                    "零误差"
                ],
                "answer": 0,
                "explain": "最小化预测误差。"
            },
            {
                "question": "下列哪一项属于回归任务？",
                "difficulty": "中",
                "options": [
                    "判断垃圾邮件",
                    "预测房价",
                    "分群",
                    "降维"
                ],
                "answer": 1,
                "explain": "房价预测是回归。"
            },
            {
                "question": "线性回归通常假设数据满足什么关系？",
                "difficulty": "中",
                "options": [
                    "非线性",
                    "线性",
                    "随机",
                    "无序"
                ],
                "answer": 1,
                "explain": "假设特征线性关系。"
            },
            {
                "question": "表达式 y=wx+b 对应的是哪类模型？",
                "difficulty": "中",
                "options": [
                    "分类",
                    "回归",
                    "聚类",
                    "正则"
                ],
                "answer": 1,
                "explain": "线性回归公式。"
            },
            {
                "question": "下列哪一项通常不能用线性回归来处理？",
                "difficulty": "中",
                "options": [
                    "销量",
                    "房价",
                    "图片分类",
                    "温度"
                ],
                "answer": 2,
                "explain": "分类不用线性回归。"
            }
        ],
        "judge": [
            {
                "question": "线性回归可以直接用于分类任务。",
                "difficulty": "中",
                "answer": false,
                "explain": "只能做回归。"
            },
            {
                "question": "MSE 越小通常说明模型拟合效果越好。",
                "difficulty": "中",
                "answer": true,
                "explain": "损失越小效果越好。"
            },
            {
                "question": "基础线性回归模型只能表示直线关系。",
                "difficulty": "中",
                "answer": true,
                "explain": "基础版是线性关系。"
            },
            {
                "question": "回归任务的输出通常是离散值。",
                "difficulty": "中",
                "answer": false,
                "explain": "输出连续值。"
            },
            {
                "question": "预测股价通常可以看作回归任务。",
                "difficulty": "中",
                "answer": true,
                "explain": "股价连续值，回归任务。"
            },
            {
                "question": "线性回归训练不需要标签数据。",
                "difficulty": "中",
                "answer": false,
                "explain": "监督学习，必须标签。"
            },
            {
                "question": "损失函数用于衡量模型的预测误差。",
                "difficulty": "中",
                "answer": true,
                "explain": "损失=预测误差大小。"
            },
            {
                "question": "线性回归对噪声具有很强的鲁棒性。",
                "difficulty": "中",
                "answer": false,
                "explain": "对异常值敏感。"
            }
        ],
        "fill": [
            {
                "question": "线性回归的目标是拟合____关系。",
                "difficulty": "中",
                "answer": "线性"
            },
            {
                "question": "回归任务预测的是____值。",
                "difficulty": "中",
                "answer": "连续"
            },
            {
                "question": "线性回归常用损失函数是____。",
                "difficulty": "中",
                "answer": "均方误差"
            },
            {
                "question": "若损失定义为预测误差平方后的平均值，则该损失称为____。",
                "difficulty": "中",
                "answer": "均方误差"
            },
            {
                "question": "在线性回归中，参数 b 通常表示直线的____。",
                "difficulty": "中",
                "answer": "截距"
            },
            {
                "question": "梯度下降用于最小化____。",
                "difficulty": "中",
                "answer": "损失"
            },
            {
                "question": "线性回归假设输入与输出近似____。",
                "difficulty": "中",
                "answer": "线性"
            },
            {
                "question": "预测房价属于____问题。",
                "difficulty": "中",
                "answer": "回归"
            },
            {
                "question": "预测温度属于____任务。",
                "difficulty": "中",
                "answer": "回归"
            },
            {
                "question": "回归模型的输出通常是一个____。",
                "difficulty": "中",
                "answer": "数值"
            },
            {
                "question": "线性回归对异常值较____。",
                "difficulty": "中",
                "answer": "敏感"
            },
            {
                "question": "最小二乘法对应最小化平方____。",
                "difficulty": "中",
                "answer": "误差"
            },
            {
                "question": "线性回归本质上是在寻找最优____。",
                "difficulty": "中",
                "answer": "直线"
            },
            {
                "question": "若预测目标是销量这类连续变量，通常使用____模型。",
                "difficulty": "中",
                "answer": "回归"
            },
            {
                "question": "梯度下降中的学习率决定每次更新的____。",
                "difficulty": "中",
                "answer": "步长"
            },
            {
                "question": "训练回归模型时需要已知输入和____。",
                "difficulty": "中",
                "answer": "输出"
            },
            {
                "question": "线性回归属于____学习。",
                "difficulty": "中",
                "answer": "监督"
            },
            {
                "question": "MSE越____，拟合越好。",
                "difficulty": "中",
                "answer": "小"
            },
            {
                "question": "回归模型输出的不是类别而是____。",
                "difficulty": "中",
                "answer": "数值"
            },
            {
                "question": "房价、销量、温度这类预测通常属于____。",
                "difficulty": "中",
                "answer": "回归"
            }
        ]
    },
    "classify": {
        "single": [
            {
                "question": "逻辑回归通常用于解决什么问题？",
                "difficulty": "中",
                "options": [
                    "回归",
                    "分类",
                    "聚类",
                    "降维"
                ],
                "answer": 1,
                "explain": "逻辑回归是分类算法。"
            },
            {
                "question": "逻辑回归模型的输出通常表示什么？",
                "difficulty": "中",
                "options": [
                    "连续值",
                    "概率",
                    "整数",
                    "文本"
                ],
                "answer": 1,
                "explain": "输出样本属于某类概率。"
            },
            {
                "question": "Sigmoid 函数的输出范围是什么？",
                "difficulty": "中",
                "options": [
                    "0~1",
                    "-1~1",
                    "任意",
                    "0~100"
                ],
                "answer": 0,
                "explain": "Sigmoid输出0~1概率。"
            },
            {
                "question": "二分类任务中常用的概率阈值通常是多少？",
                "difficulty": "中",
                "options": [
                    "0.3",
                    "0.5",
                    "0.8",
                    "1.0"
                ],
                "answer": 1,
                "explain": "0.5是常用阈值。"
            },
            {
                "question": "朴素贝叶斯模型的核心假设是什么？",
                "difficulty": "中",
                "options": [
                    "相关",
                    "独立",
                    "线性",
                    "非线性"
                ],
                "answer": 1,
                "explain": "条件独立假设。"
            },
            {
                "question": "SVM 的核心优化目标是什么？",
                "difficulty": "中",
                "options": [
                    "最小间隔",
                    "最大间隔",
                    "零误差",
                    "随机"
                ],
                "answer": 1,
                "explain": "SVM最大化分类间隔。"
            },
            {
                "question": "在 SVM 中，支持向量指的是什么？",
                "difficulty": "中",
                "options": [
                    "所有样本",
                    "关键样本",
                    "噪声",
                    "中心点"
                ],
                "answer": 1,
                "explain": "支持向量决定超平面。"
            },
            {
                "question": "在 k 近邻算法中，当 k=1 时通常采用什么策略？",
                "difficulty": "中",
                "options": [
                    "最近1个",
                    "最近3个",
                    "最近5个",
                    "全部"
                ],
                "answer": 0,
                "explain": "k=1只找最近1个样本。"
            },
            {
                "question": "k 近邻属于哪一类算法？",
                "difficulty": "中",
                "options": [
                    "有参",
                    "无参",
                    "线性",
                    "非线性"
                ],
                "answer": 1,
                "explain": "k近邻是无参算法。"
            },
            {
                "question": "下列哪一项是常用的分类评价指标？",
                "difficulty": "中",
                "options": [
                    "MSE",
                    "准确率",
                    "距离",
                    "熵"
                ],
                "answer": 1,
                "explain": "准确率是分类指标。"
            }
        ],
        "judge": [
            {
                "question": "逻辑回归只能处理二分类问题。",
                "difficulty": "中",
                "answer": false,
                "explain": "可扩展多分类。"
            },
            {
                "question": "Sigmoid 函数的输出可以解释为概率。",
                "difficulty": "中",
                "answer": true,
                "explain": "输出0~1概率值。"
            },
            {
                "question": "朴素贝叶斯虽然名称中带“朴素”，但并不意味着它性能低下。",
                "difficulty": "中",
                "answer": false,
                "explain": "简单但高效。"
            },
            {
                "question": "SVM 只能处理线性分类问题。",
                "difficulty": "中",
                "answer": false,
                "explain": "核函数可非线性。"
            },
            {
                "question": "k 近邻算法在训练阶段需要显式训练模型。",
                "difficulty": "中",
                "answer": false,
                "explain": "懒惰学习，无训练。"
            },
            {
                "question": "k近邻对特征量纲较敏感。",
                "difficulty": "中",
                "answer": true,
                "explain": "距离计算会受不同特征量纲影响，通常需要先做归一化。"
            },
            {
                "question": "在其他条件相同的情况下，准确率越高通常说明分类效果越好。",
                "difficulty": "中",
                "answer": true,
                "explain": "准确率是主要指标。"
            },
            {
                "question": "分类任务的输出通常是连续值。",
                "difficulty": "中",
                "answer": false,
                "explain": "输出离散类别。"
            }
        ],
        "fill": [
            {
                "question": "逻辑回归主要用于____任务。",
                "difficulty": "中",
                "answer": "分类"
            },
            {
                "question": "Sigmoid函数将实数映射到0到____之间。",
                "difficulty": "中",
                "answer": "1"
            },
            {
                "question": "当预测概率大于 0.5 时，样本通常会被判为正____。",
                "difficulty": "中",
                "answer": "类"
            },
            {
                "question": "朴素贝叶斯在计算后验概率时依据的是贝叶斯____。",
                "difficulty": "中",
                "answer": "公式"
            },
            {
                "question": "朴素贝叶斯假设特征之间____。",
                "difficulty": "中",
                "answer": "独立"
            },
            {
                "question": "SVM的目标是最大化分类____。",
                "difficulty": "中",
                "answer": "间隔"
            },
            {
                "question": "离分类超平面最近的样本叫____。",
                "difficulty": "中",
                "answer": "支持向量"
            },
            {
                "question": "k近邻方法中，k表示考虑的邻居____。",
                "difficulty": "中",
                "answer": "数量"
            },
            {
                "question": "k近邻属于____学习算法。",
                "difficulty": "中",
                "answer": "懒惰学习"
            },
            {
                "question": "在类别分布较均衡时，常用的整体分类评价指标之一是____率。",
                "difficulty": "中",
                "answer": "准确"
            },
            {
                "question": "朴素贝叶斯在____中很常用。",
                "difficulty": "中",
                "answer": "文本分类"
            },
            {
                "question": "SVM在非线性分类中常借助____函数。",
                "difficulty": "中",
                "answer": "核"
            },
            {
                "question": "逻辑回归输出的是样本属于某类的____。",
                "difficulty": "中",
                "answer": "概率"
            },
            {
                "question": "k近邻中，k太小容易受____影响。",
                "difficulty": "中",
                "answer": "噪声"
            },
            {
                "question": "分类任务的输出是离散____。",
                "difficulty": "中",
                "answer": "类别"
            },
            {
                "question": "贝叶斯公式中的先验表示已知新证据前的____。",
                "difficulty": "中",
                "answer": "概率"
            },
            {
                "question": "朴素贝叶斯中的“朴素”指条件独立____。",
                "difficulty": "中",
                "answer": "假设"
            },
            {
                "question": "SVM寻找的是最优____。",
                "difficulty": "中",
                "answer": "超平面"
            },
            {
                "question": "k近邻不需要显式____。",
                "difficulty": "中",
                "answer": "训练"
            },
            {
                "question": "分类任务中，正确分类的比例叫____。",
                "difficulty": "中",
                "answer": "准确率"
            }
        ]
    },
    "cluster": {
        "single": [
            {
                "question": "KMeans 属于哪类算法？",
                "difficulty": "中",
                "options": [
                    "分类",
                    "聚类",
                    "回归",
                    "降维"
                ],
                "answer": 1,
                "explain": "KMeans是聚类算法。"
            },
            {
                "question": "KMeans 算法通常需要预先指定什么？",
                "difficulty": "中",
                "options": [
                    "标签",
                    "K值",
                    "文本",
                    "图像"
                ],
                "answer": 1,
                "explain": "需提前指定聚类数K。"
            },
            {
                "question": "在 KMeans 中，质心通常表示什么？",
                "difficulty": "中",
                "options": [
                    "边界点",
                    "中心点",
                    "噪声点",
                    "离群点"
                ],
                "answer": 1,
                "explain": "质心代表簇中心。"
            },
            {
                "question": "PCA 属于哪类方法？",
                "difficulty": "中",
                "options": [
                    "聚类",
                    "降维",
                    "分类",
                    "回归"
                ],
                "answer": 1,
                "explain": "PCA主成分分析降维。"
            },
            {
                "question": "PCA 通常保留哪类信息？",
                "difficulty": "中",
                "options": [
                    "全部信息",
                    "主要信息",
                    "噪声",
                    "异常值"
                ],
                "answer": 1,
                "explain": "保留最大方差信息。"
            },
            {
                "question": "层次聚类属于哪类聚类方法？",
                "difficulty": "中",
                "options": [
                    "划分",
                    "层次",
                    "线性",
                    "非线性"
                ],
                "answer": 1,
                "explain": "层次聚类构建树结构。"
            },
            {
                "question": "AGNES 是哪种层次聚类策略？",
                "difficulty": "中",
                "options": [
                    "分裂",
                    "合并",
                    "线性",
                    "非线性"
                ],
                "answer": 1,
                "explain": "自底向上合并。"
            },
            {
                "question": "聚类效果评价常用什么指标？",
                "difficulty": "中",
                "options": [
                    "准确率",
                    "轮廓系数",
                    "MSE",
                    "熵"
                ],
                "answer": 1,
                "explain": "轮廓系数评价聚类。"
            },
            {
                "question": "PCA 选择主成分的主要依据是什么？",
                "difficulty": "中",
                "options": [
                    "方差最大",
                    "距离最小",
                    "类别最多",
                    "噪声最大"
                ],
                "answer": 0,
                "explain": "PCA优先保留方差最大的方向。"
            },
            {
                "question": "KMeans 对初始聚类中心通常有什么特点？",
                "difficulty": "中",
                "options": [
                    "敏感",
                    "不敏感",
                    "无关",
                    "线性"
                ],
                "answer": 0,
                "explain": "初始质心影响结果。"
            }
        ],
        "judge": [
            {
                "question": "KMeans 聚类需要预先指定 K 值。",
                "difficulty": "中",
                "answer": true,
                "explain": "必须提前指定聚类数。"
            },
            {
                "question": "PCA 属于无监督学习方法。",
                "difficulty": "中",
                "answer": true,
                "explain": "PCA不需要标签。"
            },
            {
                "question": "聚类任务需要标签数据。",
                "difficulty": "中",
                "answer": false,
                "explain": "聚类是无监督。"
            },
            {
                "question": "层次聚类的结果通常可以进行可视化展示。",
                "difficulty": "中",
                "answer": true,
                "explain": "可画树状图。"
            },
            {
                "question": "降维过程通常会丢失一部分信息。",
                "difficulty": "中",
                "answer": true,
                "explain": "降维会损失部分信息。"
            },
            {
                "question": "KMeans 对球形且紧凑的簇通常效果较好。",
                "difficulty": "中",
                "answer": true,
                "explain": "适合紧凑球形簇。"
            },
            {
                "question": "PCA 可以降低特征之间的相关性。",
                "difficulty": "中",
                "answer": true,
                "explain": "主成分间不相关。"
            },
            {
                "question": "对于同一批数据，聚类结果一定唯一。",
                "difficulty": "中",
                "answer": false,
                "explain": "不同初始值结果不同。"
            }
        ],
        "fill": [
            {
                "question": "KMeans需要预先指定簇____。",
                "difficulty": "中",
                "answer": "数"
            },
            {
                "question": "KMeans中的质心是每个簇的____。",
                "difficulty": "中",
                "answer": "中心"
            },
            {
                "question": "PCA 中用于表示最大方差方向的新变量称为____。",
                "difficulty": "中",
                "answer": "主成分"
            },
            {
                "question": "PCA主要用于____。",
                "difficulty": "中",
                "answer": "降维"
            },
            {
                "question": "当数据没有标签而目标是自动分组时，常采用____学习。",
                "difficulty": "中",
                "answer": "无监督"
            },
            {
                "question": "AGNES是自底向上的____聚类。",
                "difficulty": "中",
                "answer": "层次"
            },
            {
                "question": "轮廓系数常用于评价____效果。",
                "difficulty": "中",
                "answer": "聚类"
            },
            {
                "question": "KMeans对初始质心较____。",
                "difficulty": "中",
                "answer": "敏感"
            },
            {
                "question": "PCA通常保留方差较____的主成分。",
                "difficulty": "中",
                "answer": "大"
            },
            {
                "question": "聚类不依赖样本的____。",
                "difficulty": "中",
                "answer": "标签"
            },
            {
                "question": "AGNES每次合并最近的两个____。",
                "difficulty": "中",
                "answer": "簇"
            },
            {
                "question": "KMeans迭代的两个步骤是分配样本和更新____。",
                "difficulty": "中",
                "answer": "质心"
            },
            {
                "question": "降维的目的是减少特征____。",
                "difficulty": "中",
                "answer": "维度"
            },
            {
                "question": "在层次聚类中，若两个样本在更低层级就被合并，说明它们之间越____。",
                "difficulty": "中",
                "answer": "相似"
            },
            {
                "question": "KMeans适合球形、紧凑的____。",
                "difficulty": "中",
                "answer": "簇"
            },
            {
                "question": "PCA的主成分彼此____。",
                "difficulty": "中",
                "answer": "不相关"
            },
            {
                "question": "最大方差方向对应PCA的第一____。",
                "difficulty": "中",
                "answer": "主成分"
            },
            {
                "question": "KMeans通过反复更新质心使目标函数不断____。",
                "difficulty": "中",
                "answer": "下降"
            },
            {
                "question": "聚类结果常用____系数评价。",
                "difficulty": "中",
                "answer": "轮廓"
            },
            {
                "question": "聚类任务通常用于发现数据的____。",
                "difficulty": "中",
                "answer": "结构"
            }
        ]
    },
    "overfit": {
        "single": [
            {
                "question": "过拟合指的是什么现象？",
                "difficulty": "中",
                "options": [
                    "训练差",
                    "训练好测试差",
                    "测试好",
                    "都差"
                ],
                "answer": 1,
                "explain": "训练好但泛化差。"
            },
            {
                "question": "欠拟合指的是什么现象？",
                "difficulty": "中",
                "options": [
                    "训练好",
                    "训练差",
                    "测试好",
                    "都好"
                ],
                "answer": 1,
                "explain": "训练效果就不好。"
            },
            {
                "question": "下列哪种方法可以防止过拟合？",
                "difficulty": "中",
                "options": [
                    "增数据",
                    "减数据",
                    "增参数",
                    "减正则"
                ],
                "answer": 0,
                "explain": "数据增广可缓解过拟合。"
            },
            {
                "question": "正则化的主要作用是什么？",
                "difficulty": "中",
                "options": [
                    "增误差",
                    "减复杂度",
                    "增参数",
                    "减数据"
                ],
                "answer": 1,
                "explain": "惩罚大权重，减复杂度。"
            },
            {
                "question": "L1 正则化通常会带来什么效果？",
                "difficulty": "中",
                "options": [
                    "稀疏",
                    "平滑",
                    "增维",
                    "减维"
                ],
                "answer": 0,
                "explain": "L1产生稀疏解。"
            },
            {
                "question": "L2 正则化通常会带来什么效果？",
                "difficulty": "中",
                "options": [
                    "稀疏",
                    "平滑",
                    "离散",
                    "跳跃"
                ],
                "answer": 1,
                "explain": "L2权重平滑。"
            },
            {
                "question": "“早停”策略指的是什么？",
                "difficulty": "中",
                "options": [
                    "提前结束",
                    "一直训练",
                    "增参数",
                    "减数据"
                ],
                "answer": 0,
                "explain": "验证集不提升时停止。"
            },
            {
                "question": "Dropout 是什么方法？",
                "difficulty": "中",
                "options": [
                    "删除神经元",
                    "删除数据",
                    "删除特征",
                    "删除标签"
                ],
                "answer": 0,
                "explain": "随机失活神经元。"
            },
            {
                "question": "验证集的主要作用是什么？",
                "difficulty": "中",
                "options": [
                    "训练",
                    "调参",
                    "测试",
                    "丢弃"
                ],
                "answer": 1,
                "explain": "用于调超参数。"
            },
            {
                "question": "下列对交叉验证的描述正确的是哪一项？",
                "difficulty": "中",
                "options": [
                    "一次划分",
                    "多次划分",
                    "不划分",
                    "随机"
                ],
                "answer": 1,
                "explain": "k折交叉多次验证。"
            }
        ],
        "judge": [
            {
                "question": "过拟合通常表现为模型的泛化能力较差。",
                "difficulty": "中",
                "answer": true,
                "explain": "训练好但测试差。"
            },
            {
                "question": "欠拟合通常说明模型过于复杂。",
                "difficulty": "中",
                "answer": false,
                "explain": "模型太简单。"
            },
            {
                "question": "正则化方法可以用于防止过拟合。",
                "difficulty": "中",
                "answer": true,
                "explain": "加惩罚项控制复杂度。"
            },
            {
                "question": "增加训练数据通常可以缓解过拟合。",
                "difficulty": "中",
                "answer": true,
                "explain": "更多数据提高泛化。"
            },
            {
                "question": "L1 正则化可以用于特征选择。",
                "difficulty": "中",
                "answer": true,
                "explain": "稀疏化自动选择。"
            },
            {
                "question": "早停策略通常需要借助验证集。",
                "difficulty": "中",
                "answer": true,
                "explain": "监控验证集性能。"
            },
            {
                "question": "Dropout 会在训练过程中随机失活部分神经元。",
                "difficulty": "中",
                "answer": true,
                "explain": "随机失活防过拟合。"
            },
            {
                "question": "发生过拟合时，模型通常会变得更简单。",
                "difficulty": "中",
                "answer": false,
                "explain": "过拟合往往太复杂。"
            }
        ],
        "fill": [
            {
                "question": "训练集表现好、测试集表现差是____。",
                "difficulty": "中",
                "answer": "过拟合"
            },
            {
                "question": "模型过于简单则可能出现____。",
                "difficulty": "中",
                "answer": "欠拟合"
            },
            {
                "question": "正则化通过加入惩罚项控制模型____。",
                "difficulty": "中",
                "answer": "复杂度"
            },
            {
                "question": "L1正则会让权重变得____。",
                "difficulty": "中",
                "answer": "稀疏"
            },
            {
                "question": "L2正则使权重更____。",
                "difficulty": "中",
                "answer": "平滑"
            },
            {
                "question": "当训练过程中验证集性能不再提升时，可采用____策略。",
                "difficulty": "中",
                "answer": "早停"
            },
            {
                "question": "Dropout是在训练中随机丢弃部分____。",
                "difficulty": "中",
                "answer": "神经元"
            },
            {
                "question": "增加数据量有助于缓解____。",
                "difficulty": "中",
                "answer": "过拟合"
            },
            {
                "question": "交叉验证用于评估模型的____能力。",
                "difficulty": "中",
                "answer": "泛化"
            },
            {
                "question": "利用验证集选择学习率、正则系数等过程称为____。",
                "difficulty": "中",
                "answer": "调参"
            },
            {
                "question": "正则化常写成损失函数加上____项。",
                "difficulty": "中",
                "answer": "惩罚"
            },
            {
                "question": "过拟合模型往往对训练样本的____也学到了。",
                "difficulty": "中",
                "answer": "噪声"
            },
            {
                "question": "欠拟合说明模型容量____。",
                "difficulty": "中",
                "answer": "不足"
            },
            {
                "question": "早停的依据通常是验证集损失不再____。",
                "difficulty": "中",
                "answer": "下降"
            },
            {
                "question": "复杂模型更容易发生____。",
                "difficulty": "中",
                "answer": "过拟合"
            },
            {
                "question": "L1正则可用于____选择。",
                "difficulty": "中",
                "answer": "特征"
            },
            {
                "question": "验证集用于选择超____。",
                "difficulty": "中",
                "answer": "参数"
            },
            {
                "question": "训练误差很低但测试误差很高说明模型____能力差。",
                "difficulty": "中",
                "answer": "泛化"
            },
            {
                "question": "降低模型复杂度可以缓解____。",
                "difficulty": "中",
                "answer": "过拟合"
            },
            {
                "question": "正则化的本质是约束模型____。",
                "difficulty": "中",
                "answer": "复杂度"
            }
        ]
    },
    "tree": {
        "single": [
            {
                "question": "决策树属于什么类型的模型？",
                "difficulty": "中",
                "options": [
                    "线性",
                    "树状",
                    "圆形",
                    "随机"
                ],
                "answer": 1,
                "explain": "树状结构递归划分。"
            },
            {
                "question": "信息熵通常用来衡量什么？",
                "difficulty": "中",
                "options": [
                    "纯度",
                    "误差",
                    "距离",
                    "相似度"
                ],
                "answer": 0,
                "explain": "熵越小纯度越高。"
            },
            {
                "question": "信息增益表示什么？",
                "difficulty": "中",
                "options": [
                    "熵增",
                    "熵减",
                    "距离",
                    "误差"
                ],
                "answer": 1,
                "explain": "特征带来的熵减少。"
            },
            {
                "question": "ID3 算法使用什么作为划分依据？",
                "difficulty": "中",
                "options": [
                    "信息增益",
                    "增益率",
                    "基尼",
                    "距离"
                ],
                "answer": 0,
                "explain": "ID3用信息增益。"
            },
            {
                "question": "C4.5 算法使用什么作为划分依据？",
                "difficulty": "中",
                "options": [
                    "信息增益",
                    "增益率",
                    "基尼",
                    "距离"
                ],
                "answer": 1,
                "explain": "C4.5用信息增益比。"
            },
            {
                "question": "CART 算法通常使用什么指标进行划分？",
                "difficulty": "中",
                "options": [
                    "信息增益",
                    "增益率",
                    "基尼",
                    "距离"
                ],
                "answer": 2,
                "explain": "CART用基尼系数。"
            },
            {
                "question": "基尼系数通常用来衡量什么？",
                "difficulty": "中",
                "options": [
                    "纯度",
                    "误差",
                    "距离",
                    "相似度"
                ],
                "answer": 0,
                "explain": "基尼系数衡量纯度。"
            },
            {
                "question": "决策树中的“剪枝”是指什么？",
                "difficulty": "中",
                "options": [
                    "增枝",
                    "减枝",
                    "不变",
                    "随机"
                ],
                "answer": 1,
                "explain": "剪掉多余分支。"
            },
            {
                "question": "预剪枝指的是什么策略？",
                "difficulty": "中",
                "options": [
                    "提前停止",
                    "后处理",
                    "增枝",
                    "随机"
                ],
                "answer": 0,
                "explain": "生长过程中提前停止。"
            },
            {
                "question": "后剪枝指的是什么策略？",
                "difficulty": "中",
                "options": [
                    "提前停止",
                    "先生长后剪",
                    "增枝",
                    "随机"
                ],
                "answer": 1,
                "explain": "完全生长后剪枝。"
            }
        ],
        "judge": [
            {
                "question": "决策树模型通常具有较强的可解释性。",
                "difficulty": "中",
                "answer": true,
                "explain": "规则清晰易理解。"
            },
            {
                "question": "在其他条件相同的情况下，信息增益越大通常说明划分效果越好。",
                "difficulty": "中",
                "answer": true,
                "explain": "熵减越大划分越好。"
            },
            {
                "question": "C4.5 在一定程度上缓解了 ID3 对多值属性的偏好。",
                "difficulty": "中",
                "answer": true,
                "explain": "增益率校正多值偏好。"
            },
            {
                "question": "CART 只能用于分类任务。",
                "difficulty": "中",
                "answer": false,
                "explain": "CART可分类可回归。"
            },
            {
                "question": "决策树剪枝可以在一定程度上防止过拟合。",
                "difficulty": "中",
                "answer": true,
                "explain": "减枝降低复杂度。"
            },
            {
                "question": "基尼系数越小，通常说明节点纯度越高。",
                "difficulty": "中",
                "answer": true,
                "explain": "基尼小纯度高。"
            },
            {
                "question": "决策树模型对噪声通常具有很强的鲁棒性。",
                "difficulty": "中",
                "answer": false,
                "explain": "容易过拟合噪声。"
            },
            {
                "question": "经典 ID3 算法通常只能直接处理离散特征。",
                "difficulty": "中",
                "answer": true,
                "explain": "ID3处理离散特征。"
            }
        ],
        "fill": [
            {
                "question": "从根节点到叶节点的一条路径通常对应一条____规则。",
                "difficulty": "中",
                "answer": "if-then"
            },
            {
                "question": "信息熵衡量数据的____。",
                "difficulty": "中",
                "answer": "纯度"
            },
            {
                "question": "信息增益越大，说明划分越____。",
                "difficulty": "中",
                "answer": "好"
            },
            {
                "question": "ID3使用信息____选择划分属性。",
                "difficulty": "中",
                "answer": "增益"
            },
            {
                "question": "为削弱 ID3 对多值属性的偏好，C4.5 采用信息增益____。",
                "difficulty": "中",
                "answer": "率"
            },
            {
                "question": "CART分类树常用____系数。",
                "difficulty": "中",
                "answer": "基尼"
            },
            {
                "question": "剪枝可以减少模型的____。",
                "difficulty": "中",
                "answer": "复杂度"
            },
            {
                "question": "预剪枝是在树生长过程中提前____。",
                "difficulty": "中",
                "answer": "停止"
            },
            {
                "question": "后剪枝是在树生成后再进行____。",
                "difficulty": "中",
                "answer": "修剪"
            },
            {
                "question": "决策树具有较强的____性。",
                "difficulty": "中",
                "answer": "可解释"
            },
            {
                "question": "信息熵越小，数据越____。",
                "difficulty": "中",
                "answer": "纯"
            },
            {
                "question": "基尼系数越小，纯度越____。",
                "difficulty": "中",
                "answer": "高"
            },
            {
                "question": "ID3容易偏好多值____。",
                "difficulty": "中",
                "answer": "特征"
            },
            {
                "question": "决策树的叶子节点对应最终____。",
                "difficulty": "中",
                "answer": "类别"
            },
            {
                "question": "决策树的内部节点表示特征的____。",
                "difficulty": "中",
                "answer": "判断"
            },
            {
                "question": "CART可以用于分类也可以用于____。",
                "difficulty": "中",
                "answer": "回归"
            },
            {
                "question": "剪枝的目的之一是防止____。",
                "difficulty": "中",
                "answer": "过拟合"
            },
            {
                "question": "决策树通过递归划分样本空间形成____结构。",
                "difficulty": "中",
                "answer": "树"
            },
            {
                "question": "信息增益反映的是熵的____。",
                "difficulty": "中",
                "answer": "减少"
            },
            {
                "question": "决策树适合表达一系列____规则。",
                "difficulty": "中",
                "answer": "if-then"
            }
        ]
    },
    "rl": {
        "single": [
            {
                "question": "强化学习的核心机制是什么？",
                "difficulty": "中",
                "options": [
                    "标签",
                    "奖励",
                    "损失",
                    "梯度"
                ],
                "answer": 1,
                "explain": "奖励信号驱动学习。"
            },
            {
                "question": "在强化学习中，“智能体”指什么？",
                "difficulty": "中",
                "options": [
                    "环境",
                    "决策者",
                    "状态",
                    "动作"
                ],
                "answer": 1,
                "explain": "智能体是决策主体。"
            },
            {
                "question": "在强化学习中，环境通常向智能体提供什么？",
                "difficulty": "中",
                "options": [
                    "奖励",
                    "损失",
                    "梯度",
                    "参数"
                ],
                "answer": 0,
                "explain": "环境反馈奖励信号。"
            },
            {
                "question": "在强化学习中，“状态”指什么？",
                "difficulty": "中",
                "options": [
                    "当前情况",
                    "历史",
                    "未来",
                    "随机"
                ],
                "answer": 0,
                "explain": "环境当前状态描述。"
            },
            {
                "question": "在强化学习中，“动作”指什么？",
                "difficulty": "中",
                "options": [
                    "决策",
                    "状态",
                    "奖励",
                    "环境"
                ],
                "answer": 0,
                "explain": "智能体执行的行为。"
            },
            {
                "question": "在强化学习中，“策略”指什么？",
                "difficulty": "中",
                "options": [
                    "状态到动作",
                    "动作到状态",
                    "状态到奖励",
                    "动作到奖励"
                ],
                "answer": 0,
                "explain": "策略决定如何选动作。"
            },
            {
                "question": "价值函数通常预测什么？",
                "difficulty": "中",
                "options": [
                    "即时奖励",
                    "长期回报",
                    "损失",
                    "梯度"
                ],
                "answer": 1,
                "explain": "预测长期累积奖励。"
            },
            {
                "question": "“马尔可夫性”指的是什么性质？",
                "difficulty": "中",
                "options": [
                    "依赖历史",
                    "仅依赖当前",
                    "依赖未来",
                    "随机"
                ],
                "answer": 1,
                "explain": "下一状态仅依赖当前。"
            },
            {
                "question": "Q 学习属于哪类强化学习方法？",
                "difficulty": "中",
                "options": [
                    "有模型",
                    "无模型",
                    "监督",
                    "无监督"
                ],
                "answer": 1,
                "explain": "Q学习无需环境模型。"
            },
            {
                "question": "在强化学习中，“探索”通常指什么？",
                "difficulty": "中",
                "options": [
                    "试新",
                    "选最优",
                    "随机",
                    "固定"
                ],
                "answer": 0,
                "explain": "探索尝试新动作。"
            }
        ],
        "judge": [
            {
                "question": "强化学习需要带标签的数据进行训练。",
                "difficulty": "中",
                "answer": false,
                "explain": "通过与环境交互学习。"
            },
            {
                "question": "奖励通常是环境对动作给出的即时反馈。",
                "difficulty": "中",
                "answer": true,
                "explain": "环境即时奖励信号。"
            },
            {
                "question": "策略决定了智能体如何选择动作。",
                "difficulty": "中",
                "answer": true,
                "explain": "策略是状态到动作映射。"
            },
            {
                "question": "价值函数可以用于评估状态的优劣。",
                "difficulty": "中",
                "answer": true,
                "explain": "预测长期回报。"
            },
            {
                "question": "马尔可夫性假设未来只与当前状态有关，而与更早历史无关。",
                "difficulty": "中",
                "answer": true,
                "explain": "仅依赖当前状态。"
            },
            {
                "question": "Q 学习需要已知环境模型。",
                "difficulty": "中",
                "answer": false,
                "explain": "Q学习是无模型算法。"
            },
            {
                "question": "ε-贪心策略可以在探索和利用之间进行权衡。",
                "difficulty": "中",
                "answer": true,
                "explain": "ε-贪心通过随机探索与贪心利用进行平衡。"
            },
            {
                "question": "强化学习属于监督学习。",
                "difficulty": "中",
                "answer": false,
                "explain": "属于独立学习范式。"
            }
        ],
        "fill": [
            {
                "question": "智能体为了获得长期回报最大化，需要不断与环境进行____。",
                "difficulty": "中",
                "answer": "交互"
            },
            {
                "question": "环境对动作的即时反馈称为____。",
                "difficulty": "中",
                "answer": "奖励"
            },
            {
                "question": "状态表示环境的当前____。",
                "difficulty": "中",
                "answer": "情况"
            },
            {
                "question": "动作是智能体在某状态下做出的____。",
                "difficulty": "中",
                "answer": "行为"
            },
            {
                "question": "策略定义了从状态到动作的____。",
                "difficulty": "中",
                "answer": "映射"
            },
            {
                "question": "价值函数衡量的是长期____。",
                "difficulty": "中",
                "answer": "回报"
            },
            {
                "question": "马尔可夫性表示未来只依赖当前____。",
                "difficulty": "中",
                "answer": "状态"
            },
            {
                "question": "Q学习学习的是动作____。",
                "difficulty": "中",
                "answer": "价值"
            },
            {
                "question": "在已知最优动作和尝试新动作之间需要保持____。",
                "difficulty": "中",
                "answer": "平衡"
            },
            {
                "question": "强化学习不依赖人工标签，而依赖奖励____。",
                "difficulty": "中",
                "answer": "信号"
            },
            {
                "question": "智能体的目标是获得最大累计____。",
                "difficulty": "中",
                "answer": "奖励"
            },
            {
                "question": "环境提供给智能体的是状态和____。",
                "difficulty": "中",
                "answer": "奖励"
            },
            {
                "question": "策略可以是确定性的，也可以是____。",
                "difficulty": "中",
                "answer": "随机"
            },
            {
                "question": "Q值表示在某状态下执行某动作的长期____。",
                "difficulty": "中",
                "answer": "收益"
            },
            {
                "question": "强化学习中的试错过程强调不断____。",
                "difficulty": "中",
                "answer": "学习"
            },
            {
                "question": "马尔可夫决策过程常缩写为____。",
                "difficulty": "中",
                "answer": "MDP"
            },
            {
                "question": "强化学习问题通常可以写成状态、动作、奖励和____。",
                "difficulty": "中",
                "answer": "策略"
            },
            {
                "question": "利用是选择当前已知最优____。",
                "difficulty": "中",
                "answer": "动作"
            },
            {
                "question": "探索是尝试未充分了解的____。",
                "difficulty": "中",
                "answer": "动作"
            },
            {
                "question": "强化学习的核心目标是学到最优____。",
                "difficulty": "中",
                "answer": "策略"
            }
        ]
    },
    "calc": {
        "single": [
            {
                "question": "下列哪一项不属于西瓜数据集的特征？",
                "difficulty": "中",
                "options": [
                    "色泽",
                    "根蒂",
                    "敲声",
                    "价格"
                ],
                "answer": 3,
                "explain": "西瓜书无价格特征。"
            },
            {
                "question": "信息增益通常按什么方式计算？",
                "difficulty": "中",
                "options": [
                    "熵增",
                    "熵减",
                    "距离",
                    "相似度"
                ],
                "answer": 1,
                "explain": "熵(D)-熵(D|A)。"
            },
            {
                "question": "基尼系数越小通常说明什么？",
                "difficulty": "中",
                "options": [
                    "越纯",
                    "越杂",
                    "无关",
                    "随机"
                ],
                "answer": 0,
                "explain": "基尼小纯度高。"
            },
            {
                "question": "信息熵的单位通常是什么？",
                "difficulty": "中",
                "options": [
                    "比特",
                    "米",
                    "秒",
                    "千克"
                ],
                "answer": 0,
                "explain": "信息熵单位是比特。"
            },
            {
                "question": "计算数据集纯度常用什么指标？",
                "difficulty": "中",
                "options": [
                    "熵",
                    "MSE",
                    "距离",
                    "时间"
                ],
                "answer": 0,
                "explain": "熵衡量集合纯度。"
            },
            {
                "question": "信息增益率是在什么基础上得到的？",
                "difficulty": "中",
                "options": [
                    "增益/熵",
                    "熵/增益",
                    "增益*熵",
                    "增益+熵"
                ],
                "answer": 0,
                "explain": "增益率=增益/特征熵。"
            },
            {
                "question": "CART 分类树通常使用什么指标？",
                "difficulty": "中",
                "options": [
                    "基尼",
                    "熵",
                    "MSE",
                    "距离"
                ],
                "answer": 0,
                "explain": "CART分类用基尼系数。"
            },
            {
                "question": "CART 回归树通常使用什么指标？",
                "difficulty": "中",
                "options": [
                    "基尼",
                    "熵",
                    "MSE",
                    "距离"
                ],
                "answer": 2,
                "explain": "CART回归用均方误差。"
            },
            {
                "question": "预剪枝通常基于什么信息做决策？",
                "difficulty": "中",
                "options": [
                    "验证集",
                    "训练集",
                    "测试集",
                    "全部"
                ],
                "answer": 0,
                "explain": "验证集性能决定剪枝。"
            },
            {
                "question": "后剪枝通常从什么样的树开始？",
                "difficulty": "中",
                "options": [
                    "顶向下",
                    "底向上",
                    "左向右",
                    "右向左"
                ],
                "answer": 1,
                "explain": "自底向上回溯剪枝。"
            }
        ],
        "judge": [
            {
                "question": "信息增益有可能取负值。",
                "difficulty": "中",
                "answer": false,
                "explain": "信息增益非负。"
            },
            {
                "question": "当基尼系数为 0 时，节点通常达到最纯状态。",
                "difficulty": "中",
                "answer": true,
                "explain": "基尼0表示完全纯。"
            },
            {
                "question": "信息熵越小，通常说明样本集合越纯。",
                "difficulty": "中",
                "answer": true,
                "explain": "熵小纯度高。"
            },
            {
                "question": "信息增益率可以在一定程度上缓解多值属性偏置问题。",
                "difficulty": "中",
                "answer": true,
                "explain": "增益率校正多值偏好。"
            },
            {
                "question": "CART 生成的决策树通常是二叉树。",
                "difficulty": "中",
                "answer": true,
                "explain": "CART只生成二叉树。"
            },
            {
                "question": "剪枝操作有可能提高训练误差。",
                "difficulty": "中",
                "answer": true,
                "explain": "剪枝可能增训练误差。"
            },
            {
                "question": "验证集可以用于辅助决策树剪枝。",
                "difficulty": "中",
                "answer": true,
                "explain": "验证集评估泛化性能。"
            },
            {
                "question": "机器学习计算题通常不需要使用公式。",
                "difficulty": "中",
                "answer": false,
                "explain": "需要掌握计算公式。"
            }
        ],
        "fill": [
            {
                "question": "若某属性划分后的条件熵与原始熵相等，则该属性的信息增益为____。",
                "difficulty": "中",
                "answer": "0"
            },
            {
                "question": "信息增益的公式可以写作熵(D)-熵(D|____)。",
                "difficulty": "中",
                "answer": "a"
            },
            {
                "question": "基尼系数越小，数据越____。",
                "difficulty": "中",
                "answer": "纯"
            },
            {
                "question": "若对数以 2 为底，则信息熵的单位为____。",
                "difficulty": "中",
                "answer": "比特"
            },
            {
                "question": "信息增益率等于信息增益除以____。",
                "difficulty": "中",
                "answer": "特征熵"
            },
            {
                "question": "当使用 CART 构建分类树时，常用的划分指标是____系数。",
                "difficulty": "中",
                "answer": "基尼"
            },
            {
                "question": "CART回归树常用____误差。",
                "difficulty": "中",
                "answer": "均方"
            },
            {
                "question": "预剪枝通常借助____集判断是否继续分裂。",
                "difficulty": "中",
                "answer": "验证"
            },
            {
                "question": "后剪枝通常按自____向上的方式回溯进行。",
                "difficulty": "中",
                "answer": "底"
            },
            {
                "question": "某二分类数据集中，TP=18，FP=6，FN=2，则查准率为____，查全率为____。",
                "difficulty": "中",
                "answer": "0.75；0.9"
            },
            {
                "question": "若一个节点中的样本全部属于同一类别，则该节点的信息熵为____。",
                "difficulty": "中",
                "answer": "0"
            },
            {
                "question": "样本点(6,1)到(0,9)的欧氏距离是____。",
                "difficulty": "中",
                "answer": "10"
            },
            {
                "question": "样本点(6,1)到(0,9)的曼哈顿距离是____。",
                "difficulty": "中",
                "answer": "14"
            },
            {
                "question": "决策树计算划分属性时需要先计算集合的____。",
                "difficulty": "中",
                "answer": "熵"
            },
            {
                "question": "信息增益越大说明划分后样本更____。",
                "difficulty": "中",
                "answer": "纯"
            },
            {
                "question": "C4.5使用的是信息增益____。",
                "difficulty": "中",
                "answer": "率"
            },
            {
                "question": "CART分类树一般是____树。",
                "difficulty": "中",
                "answer": "二叉"
            },
            {
                "question": "计算题中的模型评估常需要手工计算各类____。",
                "difficulty": "中",
                "answer": "概率"
            },
            {
                "question": "朴素贝叶斯不使用____平滑时，概率为零会导致结果为零。",
                "difficulty": "中",
                "answer": "拉普拉斯"
            },
            {
                "question": "计算题要先根据训练集统计各属性的____。",
                "difficulty": "中",
                "answer": "频率"
            }
        ]
    },
    "calcQuestions": [
        {
            "question": "已知下面的西瓜数据集，试使用朴素贝叶斯分类器判断测试样本是不是好瓜。注：不使用平滑技术\n\n| 编号 | 根蒂 | 纹理 | 好瓜 |\n| ---- | ---- | ---- | ---- |\n| 1    | 蜷缩 | 清晰 | 是   |\n| 2    | 蜷缩 | 清晰 | 是   |\n| 3    | 蜷缩 | 清晰 | 是   |\n| 4    | 硬挺 | 清晰 | 是   |\n| 5    | 硬挺 | 清晰 | 是   |\n| 6    | 硬挺 | 稍糊 | 否   |\n| 7    | 硬挺 | 稍糊 | 否   |\n| 8    | 蜷缩 | 稍糊 | 否   |\n| 9    | 蜷缩 | 模糊 | 否   |\n| 10   | 蜷缩 | 模糊 | 否   |\n\n测试样本：\n\n| 根蒂 | 纹理 |\n| ---- | ---- |\n| 硬挺 | 清晰 |",
            "difficulty": "难",
            "answer": "P(好瓜)=0.5\nP(硬挺|好瓜)=0.4\nP(清晰|好瓜)=1\nP(坏瓜)=0.5\nP(硬挺|坏瓜)=0.4\nP(清晰|坏瓜)=0\n\nP(好瓜|样本)=0.5×0.4×1=0.2\nP(坏瓜|样本)=0.5×0.4×0=0\n\n结论：测试样本是好瓜。",
            "prompt": "朴素贝叶斯分类器"
        },
        {
            "question": "已知下面的西瓜数据集，试使用朴素贝叶斯分类器判断测试样本是不是好瓜。注：不使用平滑技术\n\n| 编号 | 纹理 | 根蒂 | 好瓜 |\n| ---- | ---- | ---- | ---- |\n| 1    | 清晰 | 稍蜷 | 是   |\n| 2    | 清晰 | 稍蜷 | 是   |\n| 3    | 模糊 | 蜷缩 | 是   |\n| 4    | 模糊 | 蜷缩 | 是   |\n| 5    | 模糊 | 蜷缩 | 是   |\n| 6    | 模糊 | 硬挺 | 否   |\n| 7    | 模糊 | 硬挺 | 否   |\n| 8    | 模糊 | 硬挺 | 否   |\n| 9    | 清晰 | 硬挺 | 否   |\n| 10   | 清晰 | 硬挺 | 否   |\n\n测试样本：\n\n| 纹理 | 根蒂 |\n| ---- | ---- |\n| 清晰 | 蜷缩 |",
            "difficulty": "难",
            "answer": "P(好瓜)=0.5\nP(清晰|好瓜)=0.4\nP(蜷缩|好瓜)=0.6\nP(坏瓜)=0.5\nP(清晰|坏瓜)=0.4\nP(蜷缩|坏瓜)=0\n\nP(好瓜|样本)=0.5×0.4×0.6=0.12\nP(坏瓜|样本)=0.5×0.4×0=0\n\n结论：测试样本是好瓜。",
            "prompt": "朴素贝叶斯分类器"
        },
        {
            "question": "以上题的西瓜数据集为例，使用ID3算法，找出根节点使用哪个属性进行分类。",
            "difficulty": "难",
            "answer": "计算信息增益后，根蒂属性的信息增益更大，因此根节点使用根蒂进行分类。",
            "prompt": "ID3算法根节点选择"
        },
        {
            "question": "已知某集合中正例占 3/4，负例占 1/4，求该集合的信息熵。",
            "difficulty": "难",
            "answer": "H(D) = -3/4×log2(3/4) - 1/4×log2(1/4) ≈ 0.8113。",
            "prompt": "信息熵计算"
        },
        {
            "question": "设训练集 D 中正例 6 个、反例 4 个，按属性 A 划分后得到两个子集：D1 含 4 个样本，其中正例 3 个、反例 1 个；D2 含 6 个样本，其中正例 3 个、反例 3 个。试计算经验熵 H(D)、条件熵 H(D|A) 和信息增益 g(D,A)。",
            "difficulty": "难",
            "answer": "H(D) = -(6/10)log2(6/10) - (4/10)log2(4/10) ≈ 0.971。\nH(D1) = -(3/4)log2(3/4) - (1/4)log2(1/4) ≈ 0.811。\nH(D2) = -(3/6)log2(3/6) - (3/6)log2(3/6) = 1。\nH(D|A) = (4/10)×0.811 + (6/10)×1 = 0.9244。\ng(D,A) = H(D) - H(D|A) = 0.971 - 0.9244 = 0.0466。",
            "prompt": "信息增益计算"
        },
        {
            "question": "已知 3 个二维样本点 A(1,2)、B(2,1)、C(6,5)，KMeans 的两个初始聚类中心分别为 M1(1,1)、M2(5,4)。请按欧氏距离完成第 1 轮聚类：写出各样本的归属，并求更新后的两个聚类中心。",
            "difficulty": "难",
            "answer": "先计算各点到两个中心的距离：\nA 到 M1 的距离 = sqrt((1-1)^2 + (2-1)^2) = 1，A 到 M2 的距离 = sqrt((1-5)^2 + (2-4)^2) = sqrt(20)，所以 A 属于簇 1；\nB 到 M1 的距离 = sqrt((2-1)^2 + (1-1)^2) = 1，B 到 M2 的距离 = sqrt((2-5)^2 + (1-4)^2) = sqrt(18)，所以 B 属于簇 1；\nC 到 M1 的距离 = sqrt((6-1)^2 + (5-1)^2) = sqrt(41)，C 到 M2 的距离 = sqrt((6-5)^2 + (5-4)^2) = sqrt(2)，所以 C 属于簇 2。\n因此第 1 轮划分结果为：簇 1 = {A, B}，簇 2 = {C}。\n更新后的聚类中心：M1' = ((1+2)/2, (2+1)/2) = (1.5, 1.5)，M2' = (6, 5)。",
            "prompt": "KMeans单轮迭代计算"
        },
        {
            "question": "已知两个样本点 X1=(1,2)、X2=(4,6)，试分别计算它们的欧氏距离和曼哈顿距离。",
            "difficulty": "难",
            "answer": "欧氏距离 = sqrt((4-1)^2 + (6-2)^2) = sqrt(9+16) = 5。\n曼哈顿距离 = |4-1| + |6-2| = 3 + 4 = 7。",
            "prompt": "距离度量计算"
        },
        {
            "question": "设某二分类节点中共有 10 个样本，其中正例 4 个、反例 6 个。试计算该节点的基尼系数。",
            "difficulty": "难",
            "answer": "设正例比例 p1=4/10=0.4，反例比例 p2=6/10=0.6。\n基尼系数 Gini(D) = 1 - p1^2 - p2^2 = 1 - 0.4^2 - 0.6^2 = 1 - 0.16 - 0.36 = 0.48。",
            "prompt": "基尼系数计算"
        },
        {
            "question": "设一元线性回归模型为 y^=2x+1，给定 3 个样本点 (1,2)、(2,5)、(3,6)，试计算该模型在这 3 个样本上的均方误差（MSE）。",
            "difficulty": "难",
            "answer": "当 x=1 时，预测值为 3，平方误差为 (3-2)^2 = 1。\n当 x=2 时，预测值为 5，平方误差为 (5-5)^2 = 0。\n当 x=3 时，预测值为 7，平方误差为 (7-6)^2 = 1。\n因此 MSE = (1 + 0 + 1) / 3 = 2/3 ≈ 0.667。",
            "prompt": "线性回归损失计算"
        },
        {
            "question": "设一元线性回归模型为 y^=wx+b，其中 w=1，b=0。给定单个样本 (x,y)=(2,5)，学习率 η=0.1，损失函数取 L=1/2(y^-y)^2。试计算进行 1 次梯度下降后的参数 w 和 b。",
            "difficulty": "难",
            "answer": "初始预测值 y^ = wx+b = 1×2+0 = 2。\n误差项 y^-y = 2-5 = -3。\n对 w 的梯度：∂L/∂w = (y^-y)x = (-3)×2 = -6。\n对 b 的梯度：∂L/∂b = y^-y = -3。\n参数更新：\nw' = w - η∂L/∂w = 1 - 0.1×(-6) = 1.6。\nb' = b - η∂L/∂b = 0 - 0.1×(-3) = 0.3。\n因此更新后 w=1.6，b=0.3。",
            "prompt": "线性回归梯度下降一步更新"
        }
    ],
    "combined": [
        {
            "question": "请论述 KMeans 聚类算法的完整执行流程",
            "difficulty": "难",
            "answer": "【KMeans 算法流程】\n1. 确定聚类数量 K，随机选择 K 个样本作为初始质心；\n2. 计算每个样本到所有质心的距离，将样本划分到最近的质心对应簇；\n3. 根据划分结果，重新计算每个簇的均值作为新质心；\n4. 重复步骤2、3，直到质心不再变化或达到最大迭代次数；\n5. 输出最终聚类结果。"
        },
        {
            "question": "请论述 AGNES 层次聚类算法的完整执行流程",
            "difficulty": "难",
            "answer": "【AGNES 算法流程（自底向上）】\n1. 初始化：将每个样本单独作为一个原始簇；\n2. 计算所有簇之间的相似度（距离）；\n3. 找到距离最近（最相似）的两个簇，将它们合并为一个新簇；\n4. 重复步骤2、3，直到所有样本合并为一个簇或达到目标簇数；\n5. 输出层次聚类树与最终簇结构。"
        },
        {
            "question": "请论述 SVM 支持向量机的算法流程与核心思想",
            "difficulty": "难",
            "answer": "【SVM 算法流程】\n1. 核心目标：寻找能最大化两类样本间隔的最优分类超平面；\n2. 构建带约束的优化问题，最小化结构风险，引入拉格朗日乘子；\n3. 求解凸二次规划问题，得到支持向量与分类决策函数；\n4. 线性不可分使用核函数映射到高维空间，转化为可分问题；\n5. 对新样本代入决策函数，完成分类预测。"
        },
        {
            "question": "请简述 KMeans 与 AGNES 算法的核心区别",
            "difficulty": "难",
            "answer": "【核心区别】\n1. KMeans 是划分式聚类，需提前指定 K 值，迭代优化；\n2. AGNES 是层次聚类，自底向上合并，无需提前指定 K；\n3. KMeans 计算速度快，适合大数据；AGNES 计算复杂度高；\n4. KMeans 对初始质心敏感，AGNES 对噪声敏感；\n5. KMeans 输出平面聚类，AGNES 输出层次树形结构。"
        },
        {
            "question": "请简述 SVM 的核函数作用与常用类型",
            "difficulty": "难",
            "answer": "【核函数作用】\n核函数无需显式计算高维映射，直接在原空间计算内积，解决线性不可分问题。\n【常用核函数】\n1. 线性核：线性可分场景；\n2. 多项式核：处理非线性关系；\n3. 高斯核(RBF)：通用强非线性，最常用；\n4. Sigmoid核：模拟神经网络。"
        },
        {
            "question": "请简述过拟合、欠拟合与模型复杂度之间的关系",
            "difficulty": "难",
            "answer": "【关系说明】\n1. 模型复杂度太低时，容易欠拟合，训练集和测试集表现都差；\n2. 模型复杂度适中时，能够较好拟合数据并保持泛化能力；\n3. 模型复杂度过高时，容易过拟合，训练集好、测试集差；\n4. 常通过正则化、剪枝、早停、Dropout 等方式控制复杂度。"
        },
        {
            "question": "请简述 PCA 主成分分析的核心思想",
            "difficulty": "难",
            "answer": "【核心思想】\n1. 通过线性变换把原始数据投影到新的坐标轴上；\n2. 新坐标轴按方差大小排序，优先保留方差大的方向；\n3. 通过保留少数主成分达到降维目的；\n4. 在尽量保留主要信息的同时减少特征维度。"
        },
        {
            "question": "请简述朴素贝叶斯分类器的基本假设与优点",
            "difficulty": "难",
            "answer": "【基本假设】\n1. 各属性在类别条件下相互独立；\n2. 通过贝叶斯公式计算后验概率，选择概率最大的类别。\n【优点】\n1. 模型简单、训练和预测速度快；\n2. 在文本分类等场景中效果稳定；\n3. 对高维稀疏特征较友好。"
        },
        {
            "question": "请简述集成学习中 Bagging 与 Boosting 的区别",
            "difficulty": "难",
            "answer": "【区别】\n1. Bagging 采用并行训练，样本通常通过自助采样生成，各基模型相互独立；\n2. Boosting 采用串行训练，后一个模型重点修正前一个模型的错误；\n3. Bagging 主要降低方差，Boosting 主要降低偏差；\n4. 随机森林属于 Bagging，AdaBoost/GBDT 属于 Boosting。"
        }
    ]
};

export = data;
