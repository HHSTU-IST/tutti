const data: import("../types/quiz-bank").QuizBank = {
    "_config": {
        "topicNameMap": {
            "var": "变量",
            "flow": "控制流",
            "func": "函数",
            "oop": "面向对象",
            "decorator": "装饰器",
            "magic": "魔法方法",
            "generator": "生成器",
            "thread": "进程与线程",
            "code": "编程题"
        },
        "knowledgeBase": {
            "变量": "Python 变量不需要提前声明类型，赋值时会自动绑定对象。",
            "数据类型": "常见基础类型包括 int、float、str、bool、list、tuple、dict、set。",
            "if": "if 语句根据条件真假选择执行分支，条件后面必须写冒号。",
            "for": "for 常用于遍历可迭代对象，例如列表、字符串、range 对象。",
            "while": "while 会在条件为真时重复执行，记得更新循环条件避免死循环。",
            "函数": "函数用 def 定义，可以接收参数，也可以通过 return 返回结果。",
            "return": "return 会结束当前函数，并把结果交给调用方；没有 return 时默认返回 None。",
            "lambda": "lambda 用来创建简单匿名函数，适合短小的一行表达式。",
            "类": "类是创建对象的模板，实例方法通常把 self 作为第一个参数。",
            "继承": "继承可以复用父类代码，子类也可以重写父类方法。",
            "装饰器": "装饰器本质上是可调用对象，用来在不改调用方式的前提下增强函数或类。",
            "生成器": "包含 yield 的函数会返回生成器，适合惰性产生数据。",
            "线程": "线程适合 IO 密集型任务；在 CPython 中，CPU 密集型任务会受到 GIL 影响。",
            "进程": "多进程拥有独立内存空间，更适合 CPU 密集型并行任务。",
            "魔法方法": "魔法方法是前后双下划线的方法，例如 __init__、__str__、__len__。"
        }
    },
    "var": {
        "single": [
            {
                "question": "Python中以下哪个是合法变量名？",
                "options": [
                    "1name",
                    "name_1",
                    "name-1",
                    "class"
                ],
                "answer": 1,
                "explain": "变量名不能以数字开头、不能含减号、不能使用关键字，name_1 符合规范。"
            },
            {
                "question": "a = b = 10 表示什么含义？",
                "options": [
                    "a=10，b=0",
                    "a和b都赋值为10",
                    "语法报错",
                    "a=0，b=10"
                ],
                "answer": 1,
                "explain": "Python支持链式赋值，多个变量同时赋同一个值。"
            },
            {
                "question": "以下不属于Python基本数据类型的是？",
                "options": [
                    "int",
                    "str",
                    "list",
                    "class"
                ],
                "answer": 3,
                "explain": "int、str、list都是基本数据类型，class是类定义关键字。"
            },
            {
                "question": "执行a=2, b='2'，a==b的结果是？",
                "options": [
                    "True",
                    "False",
                    "报错",
                    "None"
                ],
                "answer": 1,
                "explain": "整型和字符串类型不同，相等判断为False。"
            },
            {
                "question": "执行x = 5; y = x; x = 10，此时y的值是？",
                "options": [
                    "5",
                    "10",
                    "None",
                    "报错"
                ],
                "answer": 0,
                "explain": "Python中简单类型为值传递，x后续修改不会影响y。"
            },
            {
                "question": "以下哪种赋值方式属于解包赋值？",
                "options": [
                    "a = 1",
                    "a, b = 1, 2",
                    "a = b = 3",
                    "a += 1"
                ],
                "answer": 1,
                "explain": "解包赋值可将多个值依次赋予多个变量。"
            },
            {
                "question": "代码 print(type(3.14)) 输出类型为？",
                "options": [
                    "int",
                    "float",
                    "str",
                    "bool"
                ],
                "answer": 1,
                "explain": "3.14是浮点数，type返回float。"
            },
            {
                "question": "a, b = (10,20) 执行后b的值为？",
                "options": [
                    "10",
                    "20",
                    "(10,20)",
                    "报错"
                ],
                "answer": 1,
                "explain": "元组解包，依次赋值给a、b。"
            }
        ],
        "judge": [
            {
                "question": "Python变量声明必须指定数据类型",
                "answer": false,
                "explain": "Python是动态类型语言，变量无需声明类型，赋值自动推导类型。"
            },
            {
                "question": "Python中变量名区分大小写",
                "answer": true,
                "explain": "Name和name是两个不同的变量，Python变量名严格区分大小写。"
            },
            {
                "question": "变量赋值后就不能修改其存储的值",
                "answer": false,
                "explain": "Python变量可重新赋值，覆盖原有数据。"
            },
            {
                "question": "del关键字可以删除已定义的变量",
                "answer": true,
                "explain": "del 变量名 可删除变量，释放内存引用。"
            },
            {
                "question": "Python中可以使用关键字作为变量名",
                "answer": false,
                "explain": "关键字（if、for、class等）有固定语法含义，禁止用作变量名。"
            },
            {
                "question": "float类型变量可以存储整数和小数",
                "answer": true,
                "explain": "float浮点类型可保存小数与带.0的整数。"
            },
            {
                "question": "num = int('666') 可以合法运行",
                "answer": true,
                "explain": "纯数字字符串可通过int()强转为整型。"
            },
            {
                "question": "print(9 / 3) 打印结果是3",
                "answer": false,
                "explain": "/ 浮点除法结果为3.0，// 才是整数除法。"
            }
        ],
        "fill": [
            {
                "question": "Python 中把对象绑定到名字上的语句称为 ____ 语句。",
                "answer": "赋值",
                "explain": "x = 1 即赋值语句，名字 x 绑定到整数对象 1。"
            },
            {
                "question": "查看一个对象的数据类型，需要调用内置函数 ____。",
                "answer": "type",
                "explain": "type(obj) 返回该对象所属的类型。"
            }
        ]
    },
    "flow": {
        "single": [
            {
                "question": "以下哪个语句可以跳出for循环？",
                "options": [
                    "continue",
                    "break",
                    "pass",
                    "return"
                ],
                "answer": 1,
                "explain": "break跳出整个循环，continue跳过本次循环。"
            },
            {
                "question": "range(5) 生成的序列是？",
                "options": [
                    "0~4",
                    "1~5",
                    "0~5",
                    "1~4"
                ],
                "answer": 0,
                "explain": "range(n) 生成 0 到 n-1 左闭右开序列。"
            },
            {
                "question": "while循环的条件是哪种类型？",
                "options": [
                    "整型",
                    "布尔型",
                    "字符串",
                    "列表"
                ],
                "answer": 1,
                "explain": "while 根据布尔真假判断循环是否执行。"
            },
            {
                "question": "以下能实现循环嵌套的是？",
                "options": [
                    "for里套for",
                    "if里套for",
                    "break里套while",
                    "continue里套for"
                ],
                "answer": 0,
                "explain": "支持for循环嵌套for循环实现多层循环。"
            },
            {
                "question": "执行continue语句后，循环会？",
                "options": [
                    "终止循环",
                    "跳过本次循环剩余代码",
                    "暂停循环",
                    "重启循环"
                ],
                "answer": 1,
                "explain": "continue跳过本次后续代码，直接进入下一次循环。"
            },
            {
                "question": "range(2, 10, 2) 生成的序列是？",
                "options": [
                    "2,4,6,8",
                    "2,4,6,8,10",
                    "1,3,5,7,9",
                    "0,2,4,6,8"
                ],
                "answer": 0,
                "explain": "左闭右开区间，步长为2。"
            },
            {
                "question": "代码 for i in range(2):print(i) 打印结果？",
                "options": [
                    "0 1",
                    "1 2",
                    "0 1 2",
                    "报错"
                ],
                "answer": 0,
                "explain": "range(2) → 0,1。"
            },
            {
                "question": "a=3; if a>5:print('大')else:print('小') 输出？",
                "options": [
                    "大",
                    "小",
                    "无输出",
                    "报错"
                ],
                "answer": 1,
                "explain": "3>5不成立，走else分支。"
            }
        ],
        "judge": [
            {
                "question": "Python中if语句后面必须加冒号",
                "answer": true,
                "explain": "分支、循环、函数、类定义后必须跟冒号标识代码块开始。"
            },
            {
                "question": "if-elif-else语句中，elif可以单独使用",
                "answer": false,
                "explain": "elif必须依附if，不能单独使用。"
            },
            {
                "question": "pass语句在Python中没有实际执行逻辑",
                "answer": true,
                "explain": "pass是空占位语句，不执行任何操作。"
            },
            {
                "question": "for循环只能遍历数字序列",
                "answer": false,
                "explain": "可遍历字符串、列表、元组、字典等所有可迭代对象。"
            },
            {
                "question": "while循环可以没有终止条件，形成死循环",
                "answer": true,
                "explain": "while True 会永久循环，必须手动break终止。"
            },
            {
                "question": "if语句中条件表达式必须是布尔值",
                "answer": false,
                "explain": "Python自动隐式布尔转换：0/空容器为假，其余为真。"
            },
            {
                "question": "if 100: print('ok') 会正常打印",
                "answer": true,
                "explain": "非0数字判定为True。"
            },
            {
                "question": "while None: pass 属于死循环",
                "answer": false,
                "explain": "None视为False，循环不会执行。"
            }
        ],
        "fill": [
            {
                "question": "在循环中跳过本轮剩余代码、直接进入下一轮，应使用 ____ 语句。",
                "answer": "continue",
                "explain": "continue 只结束本轮，break 才会终止整个循环。"
            },
            {
                "question": "if/elif/else 中所有条件都不成立时，会执行 ____ 分支。",
                "answer": "else",
                "explain": "else 分支可选，用来处理兜底情况。"
            }
        ]
    },
    "func": {
        "single": [
            {
                "question": "定义函数使用哪个关键字？",
                "options": [
                    "def",
                    "function",
                    "fun",
                    "define"
                ],
                "answer": 0,
                "explain": "Python 使用 def 定义函数。"
            },
            {
                "question": "函数中*args接收的是？",
                "options": [
                    "关键字参数",
                    "不定长位置参数",
                    "默认参数",
                    "字典参数"
                ],
                "answer": 1,
                "explain": "*args接收不定长位置参数，**kwargs接收关键字参数。"
            },
            {
                "question": "匿名函数lambda的特点是？",
                "options": [
                    "可以写多行代码",
                    "自带返回值",
                    "必须定义函数名",
                    "支持复杂逻辑"
                ],
                "answer": 1,
                "explain": "lambda单行表达式，自动返回结果。"
            },
            {
                "question": "以下能让函数返回多个值的是？",
                "options": [
                    "多个return",
                    "return后接逗号分隔值",
                    "print多个值",
                    "无法返回多值"
                ],
                "answer": 1,
                "explain": "逗号分隔会自动封装为元组返回。"
            },
            {
                "question": "想要在函数内部修改全局变量，需用哪个关键字？",
                "options": [
                    "global",
                    "local",
                    "var",
                    "set"
                ],
                "answer": 0,
                "explain": "global声明后可修改全局变量。"
            },
            {
                "question": "函数参数传递说法正确的是？",
                "options": [
                    "仅值传递",
                    "仅引用传递",
                    "不可变传值，可变传引用",
                    "无规则"
                ],
                "answer": 2,
                "explain": "int/str/tuple不可变；list/dict可变引用传递。"
            },
            {
                "question": "def f():return 1,2 调用后返回值类型？",
                "options": [
                    "int",
                    "tuple",
                    "list",
                    "str"
                ],
                "answer": 1,
                "explain": "多返回值自动打包为元组。"
            },
            {
                "question": "lambda a,b:a*b 传入3,4结果为？",
                "options": [
                    "7",
                    "12",
                    "34",
                    "报错"
                ],
                "answer": 1,
                "explain": "3*4=12。"
            }
        ],
        "judge": [
            {
                "question": "Python函数必须有return返回值",
                "answer": false,
                "explain": "无return默认返回None。"
            },
            {
                "question": "函数的默认参数必须放在位置参数后面",
                "answer": true,
                "explain": "语法规定位置参数在前，默认参数在后。"
            },
            {
                "question": "函数内部定义的变量是局部变量",
                "answer": true,
                "explain": "局部变量仅函数内部有效。"
            },
            {
                "question": "递归函数是自己调用自己的函数",
                "answer": true,
                "explain": "递归核心是自身调用，必须设置终止条件。"
            },
            {
                "question": "函数名也是一个对象，可赋值给其他变量",
                "answer": true,
                "explain": "Python一切皆对象，函数可赋值传递。"
            },
            {
                "question": "无终止递归会造成栈溢出报错",
                "answer": true,
                "explain": "超出Python递归深度限制触发RecursionError。"
            },
            {
                "question": "fn = lambda x:x+1 合法匿名函数",
                "answer": true,
                "explain": "lambda适合简单单行逻辑。"
            },
            {
                "question": "def test(a=10):pass 默认参数写法合法",
                "answer": true,
                "explain": "函数默认参数定义规范。"
            }
        ],
        "fill": [
            {
                "question": "Python 中使用 ____ 关键字定义函数。",
                "answer": "def",
                "explain": "写法为 def 函数名(参数):，冒号后缩进书写函数体。"
            },
            {
                "question": "函数要把计算结果交给调用方，需要使用 ____ 关键字。",
                "answer": "return",
                "explain": "没有 return 的函数默认返回 None。"
            }
        ]
    },
    "oop": {
        "single": [
            {
                "question": "类中哪个参数代表实例自身？",
                "options": [
                    "self",
                    "this",
                    "me",
                    "obj"
                ],
                "answer": 0,
                "explain": "Python约定self指代实例对象。"
            },
            {
                "question": "Python支持多继承吗？",
                "options": [
                    "不支持",
                    "支持",
                    "仅支持两层",
                    "仅支持单层"
                ],
                "answer": 1,
                "explain": "Python允许多继承，遵循MRO顺序。"
            },
            {
                "question": "以下表示私有属性的是？",
                "options": [
                    "name",
                    "_name",
                    "__name",
                    "___name"
                ],
                "answer": 2,
                "explain": "双下划线开头为私有属性。"
            },
            {
                "question": "面向对象三大特征不包括？",
                "options": [
                    "封装",
                    "继承",
                    "多态",
                    "迭代"
                ],
                "answer": 3,
                "explain": "封装、继承、多态是三大特征。"
            },
            {
                "question": "子类继承父类后，描述错误的是？",
                "options": [
                    "可重写方法",
                    "可直接调用父类方法",
                    "不能扩展功能",
                    "可新增属性"
                ],
                "answer": 2,
                "explain": "子类完全可以扩展新增功能。"
            },
            {
                "question": "私有属性正确访问方式？",
                "options": [
                    "直接访问",
                    "公有方法间接访问",
                    "super直接访问",
                    "无法访问"
                ],
                "answer": 1,
                "explain": "私有属性禁止外部直接访问。"
            },
            {
                "question": "静态方法特点？",
                "options": [
                    "需要self",
                    "需要cls",
                    "无需self/cls",
                    "只能读实例属性"
                ],
                "answer": 2,
                "explain": "静态方法独立于类与实例。"
            },
            {
                "question": "封装的作用描述错误的是？",
                "options": [
                    "隐藏细节",
                    "提升安全",
                    "便于维护",
                    "禁止所有访问"
                ],
                "answer": 3,
                "explain": "封装是规范访问，不是禁止访问。"
            },
            {
                "question": "子类与父类同名方法，优先执行？",
                "options": [
                    "父类",
                    "子类",
                    "同时执行",
                    "报错"
                ],
                "answer": 1,
                "explain": "子类重写覆盖父类方法。"
            },
            {
                "question": "__str__ 和 __repr__ 描述正确的是？",
                "options": [
                    "完全一致",
                    "__str__用户可读",
                    "__repr__用户可读",
                    "都不可读"
                ],
                "answer": 1,
                "explain": "__str__面向用户打印，__repr__面向开发调试。"
            },
            {
                "question": "class A:pass 该代码作用是？",
                "options": [
                    "定义空函数",
                    "定义空类",
                    "创建对象",
                    "语法错误"
                ],
                "answer": 1,
                "explain": "pass占位，定义空类。"
            },
            {
                "question": "obj = A(); obj.run() 若无run方法会？",
                "options": [
                    "忽略",
                    "警告",
                    "报错",
                    "自动补全"
                ],
                "answer": 2,
                "explain": "调用不存在的方法触发异常。"
            }
        ],
        "judge": [
            {
                "question": "Python中类的构造方法是 __init__",
                "answer": true,
                "explain": "__init__ 实例化时自动初始化对象。"
            },
            {
                "question": "类属性和实例属性是完全相同的概念",
                "answer": false,
                "explain": "类属性全局共享，实例属性独有。"
            },
            {
                "question": "super()函数用于调用父类的方法",
                "answer": true,
                "explain": "super() 简化父类方法调用。"
            },
            {
                "question": "一个类可以实例化多个对象",
                "answer": true,
                "explain": "类是模板，可创建无数实例。"
            },
            {
                "question": "Python所有类默认继承object",
                "answer": true,
                "explain": "object是顶层基类。"
            },
            {
                "question": "类方法第一个参数必须是cls",
                "answer": true,
                "explain": "@classmethod 装饰器强制cls。"
            },
            {
                "question": "多态：一个接口，多种实现",
                "answer": true,
                "explain": "不同子类重写同一方法实现差异化。"
            },
            {
                "question": "实例方法必须通过对象调用",
                "answer": true,
                "explain": "实例方法依赖self实例。"
            },
            {
                "question": "Python可动态给对象添加属性",
                "answer": true,
                "explain": "动态语言特性。"
            },
            {
                "question": "继承核心目的是代码复用",
                "answer": true,
                "explain": "减少重复代码，提升开发效率。"
            },
            {
                "question": "class B:def __init__(self):self.age=18 合法构造方法",
                "answer": true,
                "explain": "初始化实例属性age。"
            },
            {
                "question": "子类完全重写父类方法属于多态实现",
                "answer": true,
                "explain": "重写是多态核心实现方式。"
            }
        ],
        "fill": [
            {
                "question": "类中方法的第一个参数约定命名为 ____，代表实例本身。",
                "answer": "self",
                "explain": "self 只是命名约定，调用时由解释器自动传入实例。"
            },
            {
                "question": "创建实例时自动执行的初始化方法名为 ____。",
                "answer": "__init__",
                "explain": "__init__ 在对象创建后自动调用，用于初始化实例属性。"
            }
        ]
    },
    "decorator": {
        "single": [
            {
                "question": "装饰器语法糖符号是？",
                "options": [
                    "#",
                    "@",
                    "$",
                    "&"
                ],
                "answer": 1,
                "explain": "@ 为装饰器专用语法糖。"
            },
            {
                "question": "多装饰器装饰顺序？",
                "options": [
                    "从上到下",
                    "从下到上",
                    "随机",
                    "同步"
                ],
                "answer": 1,
                "explain": "就近优先，由内向外执行。"
            },
            {
                "question": "保留原函数元信息使用？",
                "options": [
                    "os",
                    "sys",
                    "functools",
                    "math"
                ],
                "answer": 0,
                "explain": "functools.wraps 保留函数信息。"
            },
            {
                "question": "装饰器核心作用？",
                "options": [
                    "改代码",
                    "扩展功能",
                    "加速运行",
                    "减少参数"
                ],
                "answer": 1,
                "explain": "日志、计时、权限等通用功能增强。"
            },
            {
                "question": "多层装饰器描述正确的是？",
                "options": [
                    "外层先执行",
                    "内层先执行",
                    "不能嵌套",
                    "嵌套必报错"
                ],
                "answer": 1,
                "explain": "靠近函数的装饰器优先执行。"
            },
            {
                "question": "@log 等价于？",
                "options": [
                    "log(fn)",
                    "fn=log(fn)",
                    "fn.log()",
                    "log.exec()"
                ],
                "answer": 1,
                "explain": "语法糖底层本质赋值操作。"
            },
            {
                "question": "以下属于无参装饰器结构的是？",
                "options": [
                    "三层嵌套",
                    "两层嵌套",
                    "一层",
                    "无需函数"
                ],
                "answer": 1,
                "explain": "无参两层，有参三层。"
            }
        ],
        "judge": [
            {
                "question": "装饰器本质是一个函数",
                "answer": true,
                "explain": "装饰器是接收并返回函数的高阶函数。"
            },
            {
                "question": "装饰器只能装饰函数不能装饰类",
                "answer": false,
                "explain": "函数、类都可以使用装饰器。"
            },
            {
                "question": "带参数装饰器需要三层函数嵌套",
                "answer": true,
                "explain": "外层接收参数，中层接收函数。"
            },
            {
                "question": "装饰器不会修改原函数源码",
                "answer": true,
                "explain": "开闭原则：扩展功能不修改源码。"
            },
            {
                "question": "类装饰器需要实现 __call__ 方法",
                "answer": true,
                "explain": "让类实例可以像函数一样调用。"
            },
            {
                "question": "wraps装饰器不是强制必须使用",
                "answer": false,
                "explain": "建议使用，避免函数信息丢失。"
            },
            {
                "question": "装饰器可以在不修改调用方式前提下增强函数",
                "answer": true,
                "explain": "装饰器经典优势。"
            },
            {
                "question": "多个装饰器叠加使用完全合法",
                "answer": true,
                "explain": "项目中非常常用。"
            }
        ],
        "fill": [
            {
                "question": "装饰器语法使用 ____ 符号写在函数定义的上方。",
                "answer": "@",
                "explain": "@deco 写在 def 上方，等价于 func = deco(func)。"
            }
        ]
    },
    "magic": {
        "single": [
            {
                "question": "__len__ 配合哪个内置函数？",
                "options": [
                    "max",
                    "len",
                    "sum",
                    "type"
                ],
                "answer": 1,
                "explain": "自定义长度规则。"
            },
            {
                "question": "对象销毁自动触发的魔法方法？",
                "options": [
                    "__init__",
                    "__del__",
                    "__call__",
                    "__str__"
                ],
                "answer": 1,
                "explain": "__del__析构方法。"
            },
            {
                "question": "下标取值需要实现？",
                "options": [
                    "__getitem__",
                    "__setitem__",
                    "__delitem__",
                    "__len__"
                ],
                "answer": 0,
                "explain": "支持obj[0]取值。"
            },
            {
                "question": "== 运算自动调用？",
                "options": [
                    "__eq__",
                    "__gt__",
                    "__lt__",
                    "__add__"
                ],
                "answer": 0,
                "explain": "自定义相等判断逻辑。"
            },
            {
                "question": "大于号 > 对应魔法方法？",
                "options": [
                    "__eq__",
                    "__gt__",
                    "__le__",
                    "__ge__"
                ],
                "answer": 1,
                "explain": "gt = greater than。"
            },
            {
                "question": "__new__ 描述错误的是？",
                "options": [
                    "类方法",
                    "创建对象",
                    "返回实例",
                    "接收self"
                ],
                "answer": 3,
                "explain": "__new__参数是cls不是self。"
            },
            {
                "question": "print(obj) 自定义输出靠哪个方法？",
                "options": [
                    "__init__",
                    "__str__",
                    "__new__",
                    "__del__"
                ],
                "answer": 1,
                "explain": "print(obj) 会调用 obj.__str__() 并把返回值输出。"
            },
            {
                "question": "a + b 底层调用？",
                "options": [
                    "__add__",
                    "__plus__",
                    "__sum__",
                    "__join__"
                ],
                "answer": 0,
                "explain": "a + b 等价于 a.__add__(b)，重载该方法即可自定义加法行为。"
            }
        ],
        "judge": [
            {
                "question": "__str__ 控制对象打印输出",
                "answer": true,
                "explain": "print(对象) 自动触发__str__。"
            },
            {
                "question": "__new__ 执行顺序早于 __init__",
                "answer": true,
                "explain": "先创建对象，再初始化。"
            },
            {
                "question": "实现__call__，对象可加括号调用",
                "answer": true,
                "explain": "obj() 合法调用。"
            },
            {
                "question": "魔法方法统一前后双下划线",
                "answer": true,
                "explain": "双下方法是标识规范。"
            },
            {
                "question": "__add__ 重载加号运算符",
                "answer": true,
                "explain": "两个对象相加自动触发。"
            },
            {
                "question": "魔法方法无需手动调用",
                "answer": true,
                "explain": "系统自动触发执行。"
            },
            {
                "question": "len(obj) 想要生效必须重写__len__",
                "answer": true,
                "explain": "len(obj) 实际调用 obj.__len__()，未重写则报 TypeError。"
            }
        ],
        "fill": [
            {
                "question": "魔法方法名称的前后各带 ____ 个下划线。",
                "answer": "两",
                "explain": "如 __init__、__str__，前后各两个下划线，也称 dunder 方法。"
            }
        ]
    },
    "generator": {
        "single": [
            {
                "question": "获取生成器下一个值？",
                "options": [
                    "get",
                    "next()",
                    "read",
                    "pull"
                ],
                "answer": 1,
                "explain": "next()迭代取值。"
            },
            {
                "question": "生成器表达式使用？",
                "options": [
                    "[]",
                    "()",
                    "{}",
                    "<>"
                ],
                "answer": 1,
                "explain": "()生成器，[]列表推导。"
            },
            {
                "question": "生成器优点不包括？",
                "options": [
                    "省内存",
                    "惰性计算",
                    "海量数据",
                    "一次性加载"
                ],
                "answer": 3,
                "explain": "一次性加载是列表缺点。"
            },
            {
                "question": "生成器取完所有值后报错？",
                "options": [
                    "IndexError",
                    "StopIteration",
                    "KeyError",
                    "ValueError"
                ],
                "answer": 1,
                "explain": "迭代终止异常。"
            },
            {
                "question": "关闭生成器方法？",
                "options": [
                    "stop",
                    "close()",
                    "end",
                    "exit"
                ],
                "answer": 1,
                "explain": "gen.close()终止生成器。"
            },
            {
                "question": "<span class='code-inline'>g=(x*2 for x in range(2))</span> 是什么？",
                "options": [
                    "列表",
                    "元组",
                    "生成器",
                    "字典"
                ],
                "answer": 2,
                "explain": "圆括号包裹的推导式是生成器表达式，惰性产出，不一次性生成列表。"
            },
            {
                "question": "def gen():yield 5;g=gen()  g的类型？",
                "options": [
                    "函数",
                    "生成器",
                    "int",
                    "None"
                ],
                "answer": 1,
                "explain": "调用含 yield 的函数不会立即执行，而是返回一个 generator 对象。"
            }
        ],
        "judge": [
            {
                "question": "含yield的函数是生成器函数",
                "answer": true,
                "explain": "yield是生成器唯一标识。"
            },
            {
                "question": "生成器一次性加载全部数据",
                "answer": false,
                "explain": "惰性加载，节省内存。"
            },
            {
                "question": "yield会终止函数执行",
                "answer": false,
                "explain": "yield暂停，return终止。"
            },
            {
                "question": "for循环可直接遍历生成器",
                "answer": true,
                "explain": "生成器是可迭代对象。"
            },
            {
                "question": "yield from 可迭代子生成器",
                "answer": true,
                "explain": "简化多层生成器写法。"
            },
            {
                "question": "生成器支持重复多次迭代",
                "answer": false,
                "explain": "一次性迭代器，用完销毁。"
            },
            {
                "question": "生成器相比列表更适合大数据处理",
                "answer": true,
                "explain": "生成器惰性产出、不一次性占用内存，适合无法整体装入内存的数据流。"
            },
            {
                "question": "yield 可以多次暂停恢复函数",
                "answer": true,
                "explain": "yield 保存函数现场并交出控制权，下次 next() 从暂停处继续。"
            }
        ],
        "fill": [
            {
                "question": "函数中出现 ____ 关键字，它就变成生成器函数。",
                "answer": "yield",
                "explain": "调用生成器函数不会立即执行，而是返回一个生成器对象。"
            }
        ]
    },
    "thread": {
        "single": [
            {
                "question": "线程依附于什么？",
                "options": [
                    "程序",
                    "进程",
                    "文件",
                    "代码"
                ],
                "answer": 1,
                "explain": "线程不能脱离进程。"
            },
            {
                "question": "GIL导致多线程无法？",
                "options": [
                    "并发",
                    "并行",
                    "运行",
                    "阻塞"
                ],
                "answer": 1,
                "explain": "多进程才能多核并行。"
            },
            {
                "question": "多线程库？",
                "options": [
                    "multiprocessing",
                    "threading",
                    "socket",
                    "time"
                ],
                "answer": 1,
                "explain": "threading 是标准库中的多线程模块，multiprocessing 用于多进程。"
            },
            {
                "question": "CPU密集型适合？",
                "options": [
                    "多线程",
                    "多进程",
                    "单线程",
                    "协程"
                ],
                "answer": 1,
                "explain": "绕过GIL利用多核。"
            },
            {
                "question": "多进程库？",
                "options": [
                    "threading",
                    "multiprocessing",
                    "asyncio",
                    "logging"
                ],
                "answer": 1,
                "explain": "multiprocessing 通过子进程绕开 GIL，适合 CPU 密集型任务。"
            },
            {
                "question": "GIL存在于哪个解释器？",
                "options": [
                    "CPython",
                    "PyPy",
                    "Jython",
                    "全部"
                ],
                "answer": 0,
                "explain": "GIL 是 CPython 解释器的实现产物，Jython、IronPython 没有 GIL。"
            },
            {
                "question": "创建线程对象的类是？",
                "options": [
                    "Thread",
                    "Process",
                    "Task",
                    "Worker"
                ],
                "answer": 0,
                "explain": "threading.Thread(target=...) 创建线程，multiprocessing.Process 创建进程。"
            }
        ],
        "judge": [
            {
                "question": "进程是系统资源分配最小单位",
                "answer": true,
                "explain": "进程独立内存空间。"
            },
            {
                "question": "同进程线程共享内存",
                "answer": true,
                "explain": "共享全局变量、堆空间。"
            },
            {
                "question": "进程开销大于线程",
                "answer": true,
                "explain": "进程创建销毁成本更高。"
            },
            {
                "question": "多线程共享资源必须加锁",
                "answer": true,
                "explain": "防止竞态条件数据错乱。"
            },
            {
                "question": "IO密集型优先使用多线程",
                "answer": true,
                "explain": "IO阻塞切换开销小。"
            },
            {
                "question": "线程池减少频繁创建线程开销",
                "answer": true,
                "explain": "线程池复用已创建的线程，避免反复创建销毁的开销。"
            },
            {
                "question": "<span class='code-inline'>import threading</span> 导入线程模块",
                "answer": true,
                "explain": "threading 模块提供 Thread、Lock、Condition 等并发原语。"
            },
            {
                "question": "多进程之间默认内存隔离不共享",
                "answer": true,
                "explain": "每个进程有独立地址空间，需借助 Queue、Pipe 或共享内存通信。"
            }
        ],
        "fill": [
            {
                "question": "为保证同一时刻只有一个线程修改共享数据，需要使用 ____。",
                "answer": "锁",
                "explain": "threading.Lock 的 acquire/release 保证临界区互斥访问。"
            }
        ]
    },
    "code": {
        "single": [
            {
                "question": "阅读代码，写出运行结果：\n<div class='code-block'>a = 10\nb = 3\nprint(a // b)</div>",
                "options": [
                    "3",
                    "3.33",
                    "4",
                    "报错"
                ],
                "answer": 0,
                "explain": "// 为整数除法，向下取整，10 // 3 = 3"
            },
            {
                "question": "代码运行结果为？\n<div class='code-block'>s = 'hello'\nprint(s[1])</div>",
                "options": [
                    "h",
                    "e",
                    "l",
                    "o"
                ],
                "answer": 1,
                "explain": "字符串下标从0开始，s[0]是h，s[1]是e。"
            },
            {
                "question": "循环执行次数？\n<div class='code-block'>count = 0\nfor i in range(1,6):\n    count +=1</div>",
                "options": [
                    "4次",
                    "5次",
                    "6次",
                    "无限循环"
                ],
                "answer": 1,
                "explain": "range(1,6) 包含 1,2,3,4,5 共5个数字。"
            },
            {
                "question": "字典代码输出结果？\n<div class='code-block'>d = {'name':'Tom', 'age':18}\nprint(d.get('gender','未知'))</div>",
                "options": [
                    "报错",
                    "未知",
                    "None",
                    "Tom"
                ],
                "answer": 1,
                "explain": "get方法键不存在时，返回默认值'未知'。"
            },
            {
                "question": "while循环输出结果？\n<div class='code-block'>i = 0\nwhile i < 3:\n    i += 1\nprint(i)</div>",
                "options": [
                    "0",
                    "2",
                    "3",
                    "4"
                ],
                "answer": 2,
                "explain": "循环结束条件i=3，退出循环后打印3。"
            },
            {
                "question": "以下代码运行后a的值为？\n<div class='code-block'>a = [1,2]\nb = a\nb.append(3)</div>",
                "options": [
                    "[1,2]",
                    "[1,2,3]",
                    "[]",
                    "报错"
                ],
                "answer": 1,
                "explain": "列表引用赋值，a和b指向同一个对象。"
            },
            {
                "question": "lambda代码运行结果：\n<div class='code-block'>f = lambda x,y : x + y\nprint(f(5,6))</div>",
                "options": [
                    "11",
                    "30",
                    "56",
                    "报错"
                ],
                "answer": 0,
                "explain": "匿名函数实现两数相加，5+6=11。"
            },
            {
                "question": "字符串切片结果？\n<div class='code-block'>str1 = 'python'\nprint(str1[1:4])</div>",
                "options": [
                    "yth",
                    "pyt",
                    "tho",
                    "ytho"
                ],
                "answer": 0,
                "explain": "切片左闭右开，索引1到4，截取 yth。"
            },
            {
                "question": "多线程代码中，哪个方法用于启动线程？",
                "options": [
                    "start()",
                    "run()",
                    "begin()",
                    "open()"
                ],
                "answer": 0,
                "explain": "Thread线程对象调用start()开启子线程。"
            }
        ],
        "judge": [
            {
                "question": "以下代码可以正常运行：<div class='code-block'>if 10 > 5\n    print('yes')</div>",
                "answer": false,
                "explain": "if语句末尾缺少冒号:，属于语法错误。"
            },
            {
                "question": "<div class='code-block'>def func():\n    x = 10\nfunc()\nprint(x)</div> 运行会报错",
                "answer": true,
                "explain": "x是函数内部局部变量，外部无法访问。"
            },
            {
                "question": "列表代码 <div class='code-block'>lst = [1,2,3]\nlst.append(4)</div> 会修改原列表",
                "answer": true,
                "explain": "列表是可变对象，append()原地修改。"
            },
            {
                "question": "代码 <div class='code-block'>print(2**3)</div> 结果是8",
                "answer": true,
                "explain": "** 是幂运算，2的3次方等于8。"
            },
            {
                "question": "生成器代码 <div class='code-block'>g = (x for x in range(5))</div> 是合法语法",
                "answer": true,
                "explain": "小括号推导式为生成器表达式。"
            },
            {
                "question": "代码 <div class='code-block'>class Cat: pass</div> 可以创建空类",
                "answer": true,
                "explain": "pass占位语句，允许定义空类。"
            },
            {
                "question": "代码中 <span class='code-inline'>break</span> 只能用于循环体内",
                "answer": true,
                "explain": "break、continue仅允许在for/while循环中使用。"
            },
            {
                "question": "<div class='code-block'>try:\n    1 / 0\nexcept ZeroDivisionError:\n    print('错误')</div> 可以捕获除零异常",
                "answer": true,
                "explain": "精准捕获除零错误，程序不会崩溃。"
            },
            {
                "question": "代码 <span class='code-inline'>yield</span> 关键字只能用在函数中",
                "answer": true,
                "explain": "包含yield的函数即为生成器函数。"
            }
        ]
    },
    "combined": [
        {
            "question": "请综合说明 Python 中可变对象与不可变对象的区别，并举例说明在函数传参时可能产生的影响。",
            "answer": "【参考答案】\n1. 不可变对象如 int、float、str、tuple，值一旦创建不能原地修改，修改会产生新对象；\n2. 可变对象如 list、dict、set，可以在原对象上增删改；\n3. Python 函数传参传递的是对象引用，函数内部若原地修改可变对象，外部变量也能观察到变化；\n4. 若对不可变对象重新赋值，只是让局部变量绑定新对象，不会改变外部对象；\n5. 编写函数时应避免把可变对象作为默认参数，防止多次调用共享同一个对象。"
        },
        {
            "question": "请综合说明装饰器的工作原理，并写出一个可用于统计函数调用次数的装饰器思路。",
            "answer": "【参考答案】\n1. 装饰器本质是接收函数并返回新函数的可调用对象；\n2. 使用 @decorator 等价于 func = decorator(func)；\n3. 内层 wrapper 通常接收 *args 和 **kwargs，调用原函数并返回结果；\n4. 统计调用次数时，可在外层作用域保存计数变量，或把计数记录在 wrapper 属性上；\n5. 实际编写时常配合 functools.wraps 保留原函数名称、文档字符串等元信息。"
        },
        {
            "question": "请综合比较生成器、列表推导式与普通列表在内存使用和执行时机上的区别。",
            "answer": "【参考答案】\n1. 普通列表和列表推导式会一次性构造所有元素，占用与元素数量相关的内存；\n2. 生成器按需惰性产生元素，通常只保存当前状态，适合大数据流或无限序列；\n3. 列表可反复遍历、支持索引和切片，生成器通常只能顺序消费一次；\n4. 列表推导式语法简洁，适合中小规模数据转换；\n5. 当只需要逐个处理结果、不需要随机访问时，生成器更节省内存。"
        },
        {
            "question": "请综合说明 Python 多线程与多进程的适用场景，并解释 GIL 对它们的影响。",
            "answer": "【参考答案】\n1. 线程共享进程内存，创建和切换成本较低，适合网络请求、文件读写等 IO 密集型任务；\n2. 进程拥有独立内存空间，隔离性更强，适合 CPU 密集型并行计算；\n3. CPython 的 GIL 使同一进程内多个线程难以同时执行 Python 字节码；\n4. 因此 CPU 密集型任务通常使用 multiprocessing 或其他原生扩展释放 GIL；\n5. IO 密集型任务中线程在等待 IO 时会释放执行机会，仍能提升并发效率。"
        },
        {
            "question": "请综合说明面向对象中 __init__、实例属性、类属性和继承的关系。",
            "answer": "【参考答案】\n1. __init__ 是实例初始化方法，创建对象后用于设置初始状态；\n2. 实例属性通常通过 self.name 绑定，每个对象各自拥有；\n3. 类属性定义在类体中，被所有实例共享，适合保存公共配置或计数；\n4. 子类可以继承父类属性和方法，也可以重写方法改变行为；\n5. 子类初始化时若需要复用父类初始化逻辑，通常调用 super().__init__()。"
        }
    ]
};

export = data;
