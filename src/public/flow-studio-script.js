// ============ FLOW STUDIO - VISUAL FLOW BUILDER ============

class FlowStudio {
    constructor() {
        this.currentFlow = null;
        this.reactFlowInstance = null;
        this.selectedNode = null;
        this.nodeIdCounter = 1;
        this.isUpdatingProperties = false; // Flag to prevent update loops
        
        // Node definitions
        this.nodeDefinitions = {
            basic: [
                {
                    type: 'start',
                    name: 'Start',
                    description: 'Punkt początkowy flow',
                    icon: 'fas fa-play',
                    color: '#39e575',
                    inputs: 0,
                    outputs: 1,
                    advanced: true
                },
                {
                    type: 'message',
                    name: 'Wiadomość',
                    description: 'Wyślij wiadomość do użytkownika',
                    icon: 'fas fa-comment',
                    color: '#3b82f6',
                    inputs: 1,
                    outputs: 1
                },
                {
                    type: 'input',
                    name: 'Pytanie',
                    description: 'Zadaj pytanie użytkownikowi',
                    icon: 'fas fa-question',
                    color: '#f59e0b',
                    inputs: 1,
                    outputs: 1
                },
                {
                    type: 'end',
                    name: 'Koniec',
                    description: 'Zakończenie flow',
                    icon: 'fas fa-stop',
                    color: '#ef4444',
                    inputs: 1,
                    outputs: 0,
                    advanced: true
                }
            ],
            logic: [
                {
                    type: 'condition',
                    name: 'Warunek',
                    description: 'Rozgałęzienie na podstawie warunku',
                    icon: 'fas fa-code-branch',
                    color: '#8b5cf6',
                    inputs: 1,
                    outputs: 2,
                    advanced: true
                },
                {
                    type: 'switch',
                    name: 'Przełącznik',
                    description: 'Wybór z wielu opcji',
                    icon: 'fas fa-list',
                    color: '#06b6d4',
                    inputs: 1,
                    outputs: 3,
                    advanced: true
                }
            ],
            ai: [
                {
                    type: 'ai_response',
                    name: 'Odpowiedź AI',
                    description: 'Generuj odpowiedź przez AI',
                    icon: 'fas fa-robot',
                    color: '#10b981',
                    inputs: 1,
                    outputs: 1,
                    advanced: true
                },
                {
                    type: 'intent_check',
                    name: 'Sprawdź Intent',
                    description: 'Rozpoznaj intencję użytkownika',
                    icon: 'fas fa-search',
                    color: '#f97316',
                    inputs: 1,
                    outputs: 2,
                    advanced: true
                }
            ],
            actions: [
                {
                    type: 'api_call',
                    name: 'Wywołanie API',
                    description: 'Wykonaj zapytanie do API',
                    icon: 'fas fa-plug',
                    color: '#ec4899',
                    inputs: 1,
                    outputs: 2,
                    advanced: true
                },
                {
                    type: 'tool_execution',
                    name: 'Narzędzie AI',
                    description: 'Wykonaj funkcję/narzędzie AI',
                    icon: 'fas fa-wrench',
                    color: '#8b5cf6',
                    inputs: 1,
                    outputs: 2,
                    advanced: true
                },
                {
                    type: 'data_transform',
                    name: 'Transformacja Danych',
                    description: 'Przetworz i przekształć dane',
                    icon: 'fas fa-exchange-alt',
                    color: '#06b6d4',
                    inputs: 1,
                    outputs: 1,
                    advanced: true
                },
                {
                    type: 'parallel_task',
                    name: 'Zadania Równoległe',
                    description: 'Wykonaj kilka zadań jednocześnie',
                    icon: 'fas fa-tasks',
                    color: '#f59e0b',
                    inputs: 1,
                    outputs: 3,
                    advanced: true
                },
                {
                    type: 'goal_check',
                    name: 'Sprawdź Cel',
                    description: 'Weryfikuj osiągnięcie celu agenta',
                    icon: 'fas fa-bullseye',
                    color: '#10b981',
                    inputs: 1,
                    outputs: 2,
                    advanced: true
                },
                {
                    type: 'delay',
                    name: 'Opóźnienie',
                    description: 'Pauza przed następnym krokiem',
                    icon: 'fas fa-clock',
                    color: '#64748b',
                    inputs: 1,
                    outputs: 1
                }
            ]
        };
        
        this.currentFlowType = 'basic'; // basic | advanced
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeReactFlow();
        this.loadNodePalette();
        this.loadUserFlows();
        this.loadIntentLibrary();
        
        console.log('🌊 Flow Studio initialized');
    }

    bindEvents() {
        // Header actions
        document.getElementById('backBtn')?.addEventListener('click', () => this.goBack());
        document.getElementById('newFlowBtn')?.addEventListener('click', () => this.showNewFlowModal());
        document.getElementById('saveFlowBtn')?.addEventListener('click', () => this.saveFlow());
        document.getElementById('testFlowBtn')?.addEventListener('click', () => this.testFlow());
        document.getElementById('publishFlowBtn')?.addEventListener('click', () => this.publishFlow());

        // Flow selector
        document.getElementById('flowSelector')?.addEventListener('change', (e) => {
            this.loadFlow(e.target.value);
        });

        // Toolbar actions
        document.getElementById('selectTool')?.addEventListener('click', () => this.setTool('select'));
        document.getElementById('panTool')?.addEventListener('click', () => this.setTool('pan'));
        document.getElementById('zoomInBtn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('fitViewBtn')?.addEventListener('click', () => this.fitView());
        document.getElementById('gridToggle')?.addEventListener('click', () => this.toggleGrid());
        document.getElementById('minimapToggle')?.addEventListener('click', () => this.toggleMinimap());

        // Modal actions
        document.getElementById('modalCloseBtn')?.addEventListener('click', () => this.hideNewFlowModal());
        document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.hideNewFlowModal());
        document.getElementById('modalCreateBtn')?.addEventListener('click', () => this.createNewFlow());
        
        // Intent management events
        document.getElementById('createIntentBtn')?.addEventListener('click', () => this.showCreateIntentModal());
        document.getElementById('intentSearch')?.addEventListener('input', (e) => this.filterIntents(e.target.value));
        
        // Intent modal events
        document.getElementById('intentModalCloseBtn')?.addEventListener('click', () => this.hideIntentModal());
        document.getElementById('intentModalCancelBtn')?.addEventListener('click', () => this.hideIntentModal());
        document.getElementById('saveIntentBtn')?.addEventListener('click', () => this.saveIntent());
        document.getElementById('deleteIntentBtn')?.addEventListener('click', () => this.deleteIntent());

        // Category selection (nodes)
        document.querySelectorAll('.category').forEach(category => {
            category.addEventListener('click', () => {
                document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
                category.classList.add('active');
                this.loadNodePalette(category.dataset.category);
            });
        });

        // Intent category selection (will be added dynamically)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-item')) {
                this.switchIntentCategory(e.target.dataset.category);
            }
        });

        // Node search
        document.getElementById('nodeSearch')?.addEventListener('input', (e) => {
            this.filterNodes(e.target.value);
        });

        // Click outside modal to close
        document.getElementById('flowModalOverlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideNewFlowModal();
            }
        });
    }

    initializeReactFlow() {
        const wrapper = document.getElementById('reactflowWrapper');
        if (!wrapper) return;

        // Create FlowCanvas functional component
        const FlowCanvas = () => {
            const [nodes, setNodes] = window.ReactFlow.useNodesState([]);
            const [edges, setEdges] = window.ReactFlow.useEdgesState([]);
            const reactFlowInstance = React.useRef(null);

            // Store references in class instance
            React.useEffect(() => {
                console.log('🔗 Updating FlowStudio references - nodes:', nodes.length, 'edges:', edges.length);
                this.nodes = nodes;
                this.setNodes = setNodes;
                this.edges = edges;
                this.setEdges = setEdges;
            }, [setNodes, setEdges]); // Remove nodes and edges from dependencies to prevent loops

            const onInit = (instance) => {
                reactFlowInstance.current = instance;
                this.reactFlowInstance = instance;
                console.log('ReactFlow initialized');
            };

            const onNodeClick = (event, node) => {
                console.log('ReactFlow onNodeClick triggered:', node);
                this.onNodeClick(event, node);
            };

            const onNodesChange = (changes) => {
                // Debug: Check what types of changes are happening
                const changeTypes = changes.map(c => c.type);
                const nonPositionChanges = changes.filter(c => c.type !== 'position');
                
                if (nonPositionChanges.length > 0) {
                    console.log('🔄 Non-position changes detected:', changeTypes, nonPositionChanges);
                    
                    // Check if it's just initial loading or something else
                    if (changeTypes.includes('add') || changeTypes.includes('remove')) {
                        console.log('📝 Node add/remove operation - applying changes');
                        setNodes(nds => window.ReactFlow.applyNodeChanges(changes, nds));
                    } else if (changeTypes.includes('select')) {
                        console.log('👆 Node selection change - applying changes');
                        setNodes(nds => window.ReactFlow.applyNodeChanges(changes, nds));
                        
                        // Handle selection
                        setTimeout(() => {
                            if (!this.isUpdatingProperties) {
                                changes.forEach(change => {
                                    if (change.type === 'select' && change.selected) {
                                        const currentNodes = this.reactFlowInstance?.getNodes() || [];
                                        const node = currentNodes.find(n => n.id === change.id);
                                        if (node) {
                                            console.log('👤 Node selected:', node.id);
                                            this.selectedNode = node;
                                            this.updatePropertiesPanel(node);
                                        }
                                    }
                                });
                            }
                        }, 0);
                    } else {
                        console.warn('⚠️ Unknown change type, skipping to prevent loop:', changeTypes);
                    }
                } else {
                    // Position changes - apply normally
                    setNodes(nds => window.ReactFlow.applyNodeChanges(changes, nds));
                }
            };

            const onEdgesChange = (changes) => {
                console.log('Edges changes:', changes);
                setEdges(eds => window.ReactFlow.applyEdgeChanges(changes, eds));
            };

            const onConnect = (connection) => {
                this.onConnect(connection);
            };

            const onNodeDragStop = (event, node) => {
                this.onNodeDragStop(event, node);
            };

            return React.createElement(window.ReactFlow.default, {
                nodes: nodes,
                edges: edges,
                onNodesChange: onNodesChange,
                onEdgesChange: onEdgesChange,
                onConnect: onConnect,
                onNodeClick: onNodeClick,
                onNodeDragStop: onNodeDragStop,
                onInit: onInit,
                nodeTypes: this.getCustomNodeTypes(),
                connectionMode: 'strict',
                snapToGrid: true,
                snapGrid: [20, 20],
                fitView: true,
                nodesConnectable: true,
                nodesDraggable: true,
                elementsSelectable: true,
                attributionPosition: 'bottom-left'
            }, [
                // Background
                React.createElement(window.ReactFlow.Background, {
                    key: 'background',
                    variant: 'dots',
                    gap: 20,
                    size: 1,
                    color: 'rgba(57, 229, 117, 0.2)'
                }),
                
                // Controls
                React.createElement(window.ReactFlow.Controls, {
                    key: 'controls',
                    showZoom: false,
                    showFitView: false,
                    showInteractive: false
                }),
                
                // Minimap
                React.createElement(window.ReactFlow.MiniMap, {
                    key: 'minimap',
                    nodeColor: '#39e575',
                    maskColor: 'rgba(0, 0, 0, 0.8)',
                    style: { display: 'none' },
                    id: 'minimap'
                })
            ]);
        };

        // Render FlowCanvas component
        const root = ReactDOM.createRoot(wrapper);
        root.render(React.createElement(FlowCanvas));
    }

    getCustomNodeTypes() {
        const self = this; // Capture reference to FlowStudio instance
        
        return {
            flowNode: ({ data, selected }) => {
                const nodeType = self.getNodeTypeDefinition(data.type);
                
                const hasInputs = nodeType?.inputs > 0;
                const hasOutputs = nodeType?.outputs > 0;
                
                return React.createElement('div', {
                    className: `flow-node ${selected ? 'selected' : ''}`,
                    style: {
                        background: selected ? 'rgba(57, 229, 117, 0.2)' : 'rgba(0, 0, 0, 0.8)',
                        border: `2px solid ${selected ? '#39e575' : nodeType?.color || '#888888'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        minWidth: '160px',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: selected ? '0 0 20px rgba(57, 229, 117, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.3)',
                        position: 'relative'
                    }
                }, [
                    // Input Handle (left side)
                    hasInputs && React.createElement(window.ReactFlow.Handle, {
                        key: 'input-handle',
                        type: 'target',
                        position: 'left',
                        style: {
                            background: '#39e575',
                            border: '2px solid #ffffff',
                            width: '12px',
                            height: '12px'
                        }
                    }),
                    
                    // Node header
                    React.createElement('div', {
                        key: 'header',
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px'
                        }
                    }, [
                        React.createElement('i', {
                            key: 'icon',
                            className: nodeType?.icon || 'fas fa-circle',
                            style: {
                                color: nodeType?.color || '#888888',
                                fontSize: '16px'
                            }
                        }),
                        React.createElement('span', {
                            key: 'title',
                            style: { fontWeight: '600' }
                        }, data.label || nodeType?.name || 'Node')
                    ]),
                    
                    // Node description
                    data.description && React.createElement('div', {
                        key: 'description',
                        style: {
                            color: '#888888',
                            fontSize: '12px',
                            lineHeight: '1.4'
                        }
                    }, data.description),
                    
                    // Output Handle (right side)
                    hasOutputs && React.createElement(window.ReactFlow.Handle, {
                        key: 'output-handle',
                        type: 'source',
                        position: 'right',
                        style: {
                            background: '#39e575',
                            border: '2px solid #ffffff',
                            width: '12px',
                            height: '12px'
                        }
                    })
                ]);
            }
        };
    }

    getNodeTypeDefinition(type) {
        // First check nodeDefinitions (old structure)
        for (const category of Object.values(this.nodeDefinitions || {})) {
            const nodeType = category.find(node => node.type === type);
            if (nodeType) return nodeType;
        }
        
        // Then check nodeTypes (new structure)
        for (const category of Object.values(this.nodeTypes || {})) {
            const nodeType = category.find(node => node.type === type);
            if (nodeType) return nodeType;
        }
        return null;
    }

    loadNodePalette(category = 'basic') {
        const paletteNodes = document.getElementById('paletteNodes');
        if (!paletteNodes) return;

        const nodes = this.nodeDefinitions[category] || this.nodeTypes[category] || [];
        
        // Filter nodes based on current flow type
        const filteredNodes = nodes.filter(node => {
            if (this.currentFlowType === 'basic') {
                return !node.advanced; // Show only non-advanced nodes
            }
            return true; // Show all nodes in advanced mode
        });
        
        paletteNodes.innerHTML = filteredNodes.map(node => `
            <div class="node-item ${node.advanced ? 'advanced-node' : ''}" draggable="true" data-node-type="${node.type}">
                <div class="node-icon" style="background: ${node.color}">
                    <i class="${node.icon}"></i>
                    ${node.advanced ? '<span class="advanced-badge">AI</span>' : ''}
                </div>
                <div class="node-name">${node.name}</div>
                <div class="node-description">${node.description}</div>
            </div>
        `).join('');

        // Add drag event listeners
        paletteNodes.querySelectorAll('.node-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify({
                    nodeType: item.dataset.nodeType
                }));
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('click', () => {
                this.addNodeToCanvas(item.dataset.nodeType);
            });
        });
    }

    addNodeToCanvas(nodeType, position = null) {
        if (!this.setNodes) return;

        const nodeDefinition = this.getNodeTypeDefinition(nodeType);
        if (!nodeDefinition) return;

        const newNode = {
            id: `node_${this.nodeIdCounter++}`,
            type: 'flowNode',
            position: position || { x: Math.random() * 300, y: Math.random() * 300 },
            data: {
                type: nodeType,
                label: nodeDefinition.name,
                description: nodeDefinition.description
            }
        };

        this.setNodes((nodes) => [...nodes, newNode]);
        this.showNotification(`Dodano węzeł: ${nodeDefinition.name}`, 'success');
    }

    onReactFlowInit(instance) {
        this.reactFlowInstance = instance;
        console.log('ReactFlow initialized');
    }

    onNodesChange(changes) {
        // Handle node changes
        console.log('Nodes changed:', changes);
    }

    onEdgesChange(changes) {
        // Handle edge changes
        console.log('Edges changed:', changes);
    }

    onConnect(connection) {
        // Handle new connections
        console.log('New connection attempt:', connection);
        
        if (!this.setEdges || !this.edges) {
            console.log('Missing setEdges or edges');
            return;
        }

        // Check if source node already has an outgoing connection
        const existingOutgoing = this.edges.find(edge => edge.source === connection.source);
        if (existingOutgoing) {
            this.showNotification('Węzeł może mieć tylko jedno wyjście', 'warning');
            return;
        }

        // Check if target node already has an incoming connection
        const existingIncoming = this.edges.find(edge => edge.target === connection.target);
        if (existingIncoming) {
            this.showNotification('Węzeł może mieć tylko jedno wejście', 'warning');
            return;
        }

        // Check if trying to connect to itself
        if (connection.source === connection.target) {
            this.showNotification('Nie można połączyć węzła z samym sobą', 'warning');
            return;
        }

        // Create new edge
        const newEdge = {
            id: `edge_${connection.source}_${connection.target}`,
            source: connection.source,
            target: connection.target,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#39e575', strokeWidth: 2 }
        };
        
        this.setEdges(edges => [...edges, newEdge]);
        
        // Update next_steps in source node
        this.updateNodeNextSteps(connection.source, connection.target);
        
        this.showNotification('Połączenie utworzone', 'success');
    }

    updateNodeNextSteps(sourceNodeId, targetNodeId) {
        if (!this.setNodes || !this.nodes) return;

        this.setNodes(nodes => 
            nodes.map(node => {
                if (node.id === sourceNodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            next_steps: [targetNodeId]
                        }
                    };
                }
                return node;
            })
        );
    }

    onNodeClick(event, node) {
        console.log('Node clicked:', node);
        this.selectedNode = node;
        this.updatePropertiesPanel(node);
    }

    onNodeDragStop(event, node) {
        console.log('Node moved:', node.id, node.position);
    }

    updatePropertiesPanel(node) {
        console.log('Updating properties panel for node:', node);
        const propertiesContent = document.getElementById('propertiesContent');
        console.log('Properties content element:', propertiesContent);
        
        if (!propertiesContent || !node) {
            console.log('Missing element or node:', { propertiesContent, node });
            return;
        }

        const nodeDefinition = this.getNodeTypeDefinition(node.data.type);
        console.log('Node definition:', nodeDefinition);
        
        propertiesContent.innerHTML = `
            <div class="property-section">
                <div class="property-header">
                    <h4>Węzeł: ${nodeDefinition?.name || 'Unknown'}</h4>
                    <button class="btn-danger btn-small" onclick="flowStudio.deleteSelectedNode()" title="Usuń węzeł">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                
                <div class="form-group">
                    <label for="nodeLabel">Etykieta</label>
                    <input type="text" id="nodeLabel" value="${node.data.label || ''}" 
                           onchange="flowStudio.updateNodeProperty('label', this.value)">
                </div>
                
                <div class="form-group">
                    <label for="nodeDescription">Opis</label>
                    <textarea id="nodeDescription" rows="3" 
                              onchange="flowStudio.updateNodeProperty('description', this.value)">${node.data.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="nodeIntentName">Intent Name</label>
                    <input type="text" id="nodeIntentName" value="${node.data.intent_name || ''}" 
                           onchange="flowStudio.updateNodeProperty('intent_name', this.value)"
                           placeholder="np. greeting, ask_question">
                    <div class="input-hint">Nazwa intencji która wyzwala ten krok</div>
                </div>
                
                <div class="form-group">
                    <label for="nodeSystemPrompt">System Prompt</label>
                    <div class="input-with-ai">
                        <textarea id="nodeSystemPrompt" rows="4" 
                                  onchange="flowStudio.updateNodeProperty('system_prompt', this.value)"
                                  placeholder="Instrukcja dla AI jak ma się zachowywać w tym kroku...">${node.data.system_prompt || ''}</textarea>
                        <button class="btn-ai-generate" onclick="flowStudio.generateNodeSystemPrompt()" title="Generuj AI">
                            <i class="fas fa-magic"></i>
                        </button>
                    </div>
                    <div class="input-hint">Instrukcja systemowa dla AI w tym kroku</div>
                </div>
                
                <div class="form-group">
                    <label for="nodeUserPrompt">User Prompt Template</label>
                    <div class="input-with-ai">
                        <textarea id="nodeUserPrompt" rows="4" 
                                  onchange="flowStudio.updateNodeProperty('user_prompt_template', this.value)"
                                  placeholder="Template dla user prompt z zmiennymi {{variable}}...">${node.data.user_prompt_template || ''}</textarea>
                        <button class="btn-ai-generate" onclick="flowStudio.generateNodeUserPrompt()" title="Generuj AI">
                            <i class="fas fa-magic"></i>
                        </button>
                    </div>
                    <div class="input-hint">Template dla user prompt z zmiennymi</div>
                </div>
                
                <div class="form-group">
                    <label for="nodeVariables">Variables</label>
                    <div class="input-with-ai">
                        <input type="text" id="nodeVariables" value="${(node.data.variables || []).join(', ')}" 
                               onchange="flowStudio.updateNodeProperty('variables', this.value.split(',').map(s => s.trim()).filter(s => s))"
                               placeholder="user_message, npc_persona.firstName, rag_context">
                        <button class="btn-ai-generate" onclick="flowStudio.generateNodeVariables()" title="Generuj AI">
                            <i class="fas fa-magic"></i>
                        </button>
                    </div>
                    <div class="input-hint">Dostępne zmienne w promptach (oddzielone przecinkami)</div>
                </div>
                
                <div class="form-group">
                    <label for="nodeNextSteps">Next Steps</label>
                    <input type="text" id="nodeNextSteps" value="${(node.data.next_steps || []).join(', ')}" 
                           onchange="flowStudio.updateNodeProperty('next_steps', this.value.split(',').map(s => s.trim()).filter(s => s))"
                           placeholder="step_id_1, step_id_2">
                    <div class="input-hint">ID następnych kroków (oddzielone przecinkami)</div>
                </div>
                
                <div class="form-group">
                    <label for="nodePriority">Priority</label>
                    <input type="number" id="nodePriority" value="${node.data.priority || 5}" 
                           onchange="flowStudio.updateNodeProperty('priority', parseInt(this.value))"
                           min="1" max="10">
                    <div class="input-hint">Priorytet kroku (1-10, wyższy = ważniejszy)</div>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="nodeRequired" ${node.data.required ? 'checked' : ''} 
                               onchange="flowStudio.updateNodeProperty('required', this.checked)">
                        Wymagany krok
                    </label>
                </div>
                
                ${this.getNodeSpecificProperties(node)}
            </div>
        `;
    }

    getNodeSpecificProperties(node) {
        switch (node.data.type) {
            case 'message':
                return `
                    <div class="form-group">
                        <label for="messageText">Treść wiadomości</label>
                        <textarea id="messageText" rows="4" placeholder="Wpisz treść wiadomości..."
                                  onchange="flowStudio.updateNodeProperty('message', this.value)">${node.data.message || ''}</textarea>
                    </div>
                `;
            case 'input':
                return `
                    <div class="form-group">
                        <label for="questionText">Pytanie</label>
                        <textarea id="questionText" rows="3" placeholder="Wpisz pytanie..."
                                  onchange="flowStudio.updateNodeProperty('question', this.value)">${node.data.question || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="inputType">Typ odpowiedzi</label>
                        <select id="inputType" onchange="flowStudio.updateNodeProperty('inputType', this.value)">
                            <option value="text" ${node.data.inputType === 'text' ? 'selected' : ''}>Tekst</option>
                            <option value="number" ${node.data.inputType === 'number' ? 'selected' : ''}>Liczba</option>
                            <option value="email" ${node.data.inputType === 'email' ? 'selected' : ''}>Email</option>
                            <option value="phone" ${node.data.inputType === 'phone' ? 'selected' : ''}>Telefon</option>
                        </select>
                    </div>
                `;
            case 'condition':
                return `
                    <div class="form-group">
                        <label for="conditionExpression">Warunek</label>
                        <input type="text" id="conditionExpression" placeholder="np. input.length > 10"
                               onchange="flowStudio.updateNodeProperty('condition', this.value)"
                               value="${node.data.condition || ''}">
                    </div>
                `;
            default:
                return '';
        }
    }

    updateNodeProperty(property, value) {
        if (!this.selectedNode || !this.setNodes) return;

        // Set flag to prevent update loops
        this.isUpdatingProperties = true;

        // Special handling for intent_name - auto-fill prompts
        if (property === 'intent_name' && value && this.promptTemplates) {
            const template = this.promptTemplates.find(t => t.intent === value);
            if (template) {
                // Auto-fill system prompt, user prompt and variables
                this.setNodes(nodes => 
                    nodes.map(node => {
                        if (node.id === this.selectedNode.id) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    intent_name: value,
                                    system_prompt: template.system_prompt || node.data.system_prompt,
                                    user_prompt_template: template.user_prompt_template || node.data.user_prompt_template,
                                    variables: template.variables || node.data.variables,
                                    priority: template.priority || node.data.priority
                                }
                            };
                        }
                        return node;
                    })
                );

                // Update selected node reference
                this.selectedNode.data.intent_name = value;
                this.selectedNode.data.system_prompt = template.system_prompt || this.selectedNode.data.system_prompt;
                this.selectedNode.data.user_prompt_template = template.user_prompt_template || this.selectedNode.data.user_prompt_template;
                this.selectedNode.data.variables = template.variables || this.selectedNode.data.variables;
                this.selectedNode.data.priority = template.priority || this.selectedNode.data.priority;

                // Refresh specific input values without rebuilding panel
                this.refreshPropertiesPanelValues();
                
                this.showNotification(`Auto-wypełniono prompty dla intent: ${value}`, 'success');
                
                // Clear flag and return
                setTimeout(() => { this.isUpdatingProperties = false; }, 100);
                return;
            }
        }

        // Update node data
        this.setNodes(nodes => 
            nodes.map(node => 
                node.id === this.selectedNode.id 
                    ? { ...node, data: { ...node.data, [property]: value } }
                    : node
            )
        );

        // Update selected node reference
        this.selectedNode.data[property] = value;
        
        // Clear flag after update
        setTimeout(() => { this.isUpdatingProperties = false; }, 100);
    }

    refreshPropertiesPanelValues() {
        // Only refresh input values, don't rebuild the entire panel
        if (!this.selectedNode) return;
        
        const node = this.selectedNode;
        
        // Update form values without triggering events
        const systemPrompt = document.getElementById('nodeSystemPrompt');
        const userPrompt = document.getElementById('nodeUserPrompt'); 
        const variables = document.getElementById('nodeVariables');
        const priority = document.getElementById('nodePriority');
        
        if (systemPrompt) systemPrompt.value = node.data.system_prompt || '';
        if (userPrompt) userPrompt.value = node.data.user_prompt_template || '';
        if (variables) variables.value = (node.data.variables || []).join(', ');
        if (priority) priority.value = node.data.priority || 5;
        
        console.log('🔄 Refreshed properties panel values');
    }

    deleteSelectedNode() {
        if (!this.selectedNode || !this.setNodes) return;

        const nodeId = this.selectedNode.id;
        
        // Remove connected edges first
        if (this.setEdges) {
            this.setEdges(edges => edges.filter(edge => 
                edge.source !== nodeId && edge.target !== nodeId
            ));
        }

        // Update next_steps in other nodes that pointed to this node
        this.setNodes(nodes => 
            nodes.filter(node => node.id !== nodeId) // Remove the node
                 .map(node => ({
                     ...node,
                     data: {
                         ...node.data,
                         next_steps: (node.data.next_steps || []).filter(step => step !== nodeId)
                     }
                 }))
        );
        
        // Clear selection
        this.selectedNode = null;
        this.clearPropertiesPanel();
        
        this.showNotification('Węzeł został usunięty', 'success');
    }

    clearPropertiesPanel() {
        const propertiesContent = document.getElementById('propertiesContent');
        if (propertiesContent) {
            propertiesContent.innerHTML = `
                <div class="no-selection">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>Wybierz węzeł aby edytować właściwości</p>
                </div>
            `;
        }
    }

    // Toolbar actions
    setTool(tool) {
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tool}Tool`)?.classList.add('active');
        
        // Implement tool logic here
        console.log('Tool selected:', tool);
    }

    zoomIn() {
        if (this.reactFlowInstance) {
            this.reactFlowInstance.zoomIn();
        }
    }

    zoomOut() {
        if (this.reactFlowInstance) {
            this.reactFlowInstance.zoomOut();
        }
    }

    fitView() {
        if (this.reactFlowInstance) {
            this.reactFlowInstance.fitView({ padding: 0.2 });
        }
    }

    toggleGrid() {
        const background = document.querySelector('.react-flow__background');
        if (background) {
            background.style.display = background.style.display === 'none' ? 'block' : 'none';
        }
    }

    toggleMinimap() {
        const minimap = document.getElementById('minimap');
        if (minimap) {
            minimap.style.display = minimap.style.display === 'none' ? 'block' : 'none';
        }
    }

    // Flow management
    showNewFlowModal() {
        document.getElementById('flowModalOverlay')?.classList.add('active');
        document.getElementById('flowName')?.focus();
    }

    hideNewFlowModal() {
        document.getElementById('flowModalOverlay')?.classList.remove('active');
        // Clear form
        document.getElementById('flowName').value = '';
        document.getElementById('flowDescription').value = '';
        document.getElementById('flowCategory').value = 'sales';
    }

    async createNewFlow() {
        const name = document.getElementById('flowName')?.value?.trim();
        const description = document.getElementById('flowDescription')?.value?.trim();
        const category = document.getElementById('flowCategory')?.value;

        if (!name) {
            this.showNotification('Podaj nazwę flow', 'error');
            return;
        }

        try {
            // Create new flow with start node
            const newFlow = {
                id: `flow_${Date.now()}`,
                name,
                description,
                category,
                nodes: [{
                    id: 'start_1',
                    type: 'flowNode',
                    position: { x: 100, y: 100 },
                    data: {
                        type: 'start',
                        label: 'Start',
                        description: 'Punkt początkowy flow'
                    }
                }],
                edges: [],
                created_at: new Date().toISOString()
            };

            // Save flow (mock for now)
            this.currentFlow = newFlow;
            this.loadFlowToCanvas(newFlow);
            this.addFlowToSelector(newFlow);
            
            this.hideNewFlowModal();
            this.showNotification(`Flow "${name}" został utworzony!`, 'success');
            
        } catch (error) {
            console.error('Error creating flow:', error);
            this.showNotification('Błąd podczas tworzenia flow', 'error');
        }
    }

    loadFlowToCanvas(flow) {
        if (!this.setNodes || !this.setEdges || !flow) return;

        this.setNodes(flow.nodes || []);
        this.setEdges(flow.edges || []);
        
        setTimeout(() => {
            if (this.reactFlowInstance) {
                this.reactFlowInstance.fitView({ padding: 0.2 });
            }
        }, 100);
    }

    addFlowToSelector(flow) {
        const selector = document.getElementById('flowSelector');
        if (!selector) return;

        const option = document.createElement('option');
        option.value = flow.id;
        option.textContent = flow.name;
        option.selected = true;
        selector.appendChild(option);
    }

    async loadPromptTemplates() {
        try {
            const response = await window.authManager.makeAuthenticatedRequest('/api/prompt-templates');
            if (response.ok) {
                const data = await response.json();
                this.promptTemplates = data.templates || [];
                console.log(`✅ Loaded ${this.promptTemplates.length} prompt templates`);
            }
        } catch (error) {
            console.error('Error loading prompt templates:', error);
            this.promptTemplates = [];
        }
    }

    async loadUserFlows() {
        try {
            // Load prompt templates first
            await this.loadPromptTemplates();
            
            // Load flows for different avatar types
            const avatarTypes = ['networker', 'trainer'];
            const allFlows = [];

            // Load flows for each avatar type
            for (const avatarType of avatarTypes) {
                try {
                    const response = await window.authManager.makeAuthenticatedRequest(`/api/flows?avatar_type=${avatarType}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.status === 'success' && data.flows) {
                            data.flows.forEach(flow => {
                                allFlows.push({
                                    ...flow,
                                    avatar_type: avatarType,
                                    display_name: `[${avatarType.toUpperCase()}] ${flow.name}`
                                });
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error loading flows for ${avatarType}:`, error);
                }
            }

            // Also load custom avatar flows (if any)
            try {
                // Get list of custom avatars first
                // Use AuthManager for authenticated requests
                if (window.authManager && window.authManager.isAuthenticated()) {
                    const avatarsResponse = await window.authManager.makeAuthenticatedRequest('/api/avatars');
                    
                    if (avatarsResponse.ok) {
                        const avatarsData = await avatarsResponse.json();
                        if (avatarsData.success && avatarsData.avatars) {
                            for (const avatar of avatarsData.avatars) {
                                try {
                                    const flowsResponse = await window.authManager.makeAuthenticatedRequest(`/api/avatar/${avatar.id}/flow-definitions`);
                                    if (flowsResponse.ok) {
                                        const flowsData = await flowsResponse.json();
                                        if (flowsData.status === 'success' && flowsData.flows) {
                                            flowsData.flows.forEach(flow => {
                                                allFlows.push({
                                                    ...flow,
                                                    avatar_type: 'custom',
                                                    avatar_id: avatar.id,
                                                    avatar_name: avatar.name,
                                                    display_name: `[${avatar.name}] ${flow.name}`
                                                });
                                            });
                                        }
                                    }
                                } catch (error) {
                                    console.error(`Error loading flows for custom avatar ${avatar.name}:`, error);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading custom avatar flows:', error);
            }

            // Populate selector
            const selector = document.getElementById('flowSelector');
            if (selector) {
                // Clear existing options except first
                while (selector.children.length > 1) {
                    selector.removeChild(selector.lastChild);
                }

                // Add loaded flows
                allFlows.forEach(flow => {
                    const option = document.createElement('option');
                    option.value = flow.id;
                    option.textContent = flow.display_name;
                    option.dataset.avatarType = flow.avatar_type;
                    option.dataset.avatarId = flow.avatar_id || '';
                    option.dataset.flowData = JSON.stringify(flow);
                    selector.appendChild(option);
                });

                console.log(`✅ Loaded ${allFlows.length} flows from system`);
            }
            
        } catch (error) {
            console.error('Error loading flows:', error);
            this.showNotification('Błąd podczas ładowania flows', 'error');
        }
    }

    async loadFlow(flowId) {
        if (!flowId) {
            this.clearCanvas();
            return;
        }
        
        try {
            this.showNotification('Ładowanie flow...', 'info');
            
            // Get flow data from selector option
            const selector = document.getElementById('flowSelector');
            const selectedOption = selector.querySelector(`option[value="${flowId}"]`);
            
            if (!selectedOption || !selectedOption.dataset.flowData) {
                throw new Error('Flow data not found');
            }
            
            const flowData = JSON.parse(selectedOption.dataset.flowData);
            console.log('Loading flow:', flowData);
            
            // Convert flow steps to nodes
            const nodes = this.convertFlowToNodes(flowData);
            const edges = this.convertFlowToEdges(flowData);
            
            // Load to canvas
            if (this.setNodes && this.setEdges) {
                this.setNodes(nodes);
                this.setEdges(edges);
                
                // Set as current flow
                this.currentFlow = {
                    ...flowData,
                    nodes: nodes,
                    edges: edges
                };
                
                // Fit view after loading
                setTimeout(() => {
                    if (this.reactFlowInstance) {
                        this.reactFlowInstance.fitView({ padding: 0.2 });
                    }
                }, 100);
                
                this.showNotification(`Flow "${flowData.name}" załadowany!`, 'success');
            }
            
        } catch (error) {
            console.error('Error loading flow:', error);
            this.showNotification(`Błąd podczas ładowania flow: ${error.message}`, 'error');
        }
    }

    convertFlowToNodes(flowData) {
        const nodes = [];
        const steps = flowData.steps || [];
        
        // Create nodes for each step
        steps.forEach((step, index) => {
            const nodeType = this.getNodeTypeForStep(step);
            
            // Find matching prompt template for this step's intent
            let promptTemplate = null;
            let inferredIntent = step.intent_name;
            
            // If no intent_name, try to infer from step id/name and flow entry_intents
            if (!inferredIntent && this.promptTemplates) {
                // Try to map step to intent based on step id patterns
                inferredIntent = this.inferIntentFromStep(step, flowData);
            }
            
            if (inferredIntent && this.promptTemplates) {
                promptTemplate = this.promptTemplates.find(t => t.intent === inferredIntent);
                if (promptTemplate) {
                    // console.log(`✅ Mapped step "${step.id}" to intent "${inferredIntent}"`);
                }
            }
            
            const node = {
                id: step.id,
                type: 'flowNode',
                position: { 
                    x: 100 + (index * 250), 
                    y: 100 + Math.floor(index / 4) * 200 
                },
                data: {
                    type: nodeType,
                    label: step.name || step.id,
                    description: step.description || '',
                    intent_name: inferredIntent || step.intent_name || '',
                    next_steps: step.next_steps || [],
                    required: step.required || false,
                    // Add prompt template data if found
                    system_prompt: promptTemplate?.system_prompt || step.system_prompt || '',
                    user_prompt_template: promptTemplate?.user_prompt_template || step.user_prompt_template || '',
                    variables: promptTemplate?.variables || step.variables || [],
                    priority: promptTemplate?.priority || step.priority || 5,
                    // Copy all original step data
                    ...step
                }
            };
            
            nodes.push(node);
        });
        
        return nodes;
    }

    convertFlowToEdges(flowData) {
        const edges = [];
        const steps = flowData.steps || [];
        
        // Create edges based on next_steps
        steps.forEach(step => {
            if (step.next_steps && step.next_steps.length > 0) {
                step.next_steps.forEach(nextStepId => {
                    // Check if target step exists
                    const targetExists = steps.some(s => s.id === nextStepId);
                    if (targetExists) {
                        const edge = {
                            id: `edge_${step.id}_${nextStepId}`,
                            source: step.id,
                            target: nextStepId,
                            type: 'smoothstep',
                            animated: true,
                            style: { stroke: '#39e575', strokeWidth: 2 }
                        };
                        edges.push(edge);
                    }
                });
            }
        });
        
        return edges;
    }

    inferIntentFromStep(step, flowData) {
        // Map step IDs/names to intents based on common patterns
        const stepId = step.id.toLowerCase();
        const stepName = (step.name || '').toLowerCase();
        const flowEntryIntents = flowData.entry_intents || [];
        
        // Direct mappings based on step ID patterns
        if (stepId.includes('greeting') || stepId.includes('initial_greeting')) {
            return 'greeting';
        }
        if (stepId.includes('company_intro') || stepId.includes('company_overview')) {
            return 'ask_about_npc_firm';
        }
        if (stepId.includes('user_question') || stepId.includes('answer_question')) {
            return 'user_questions';
        }
        if (stepId.includes('solution') || stepId.includes('value_proposition')) {
            return 'solution_presentation';
        }
        if (stepId.includes('need') || stepId.includes('gather_info')) {
            return 'user_needs_gathering';
        }
        if (stepId.includes('comment') || stepId.includes('feedback')) {
            return 'user_comments';
        }
        if (stepId.includes('expectation') || stepId.includes('expect')) {
            return 'user_expectations';
        }
        
        // For training flows
        if (stepId.includes('theory') || stepName.includes('teoria')) {
            return 'theory_request';
        }
        if (stepId.includes('practice') || stepName.includes('praktyk')) {
            return 'practice_together';
        }
        if (stepId.includes('guide') || stepName.includes('przewodnik')) {
            return 'guide_me';
        }
        if (stepId.includes('what_is') || stepName.includes('co to')) {
            return 'what_is';
        }
        if (stepId.includes('show_me') || stepName.includes('pokaż')) {
            return 'show_me_how';
        }
        
        // If flow has entry_intents, use the first one as fallback
        if (flowEntryIntents.length > 0) {
            return flowEntryIntents[0];
        }
        
        // Default fallback
        return 'user_questions';
    }

    getNodeTypeForStep(step) {
        // Try to determine node type based on step properties
        if (step.id.includes('greeting') || step.id.includes('start')) {
            return 'start';
        }
        if (step.id.includes('end') || step.id.includes('complete')) {
            return 'end';
        }
        if (step.id.includes('question') || step.id.includes('input')) {
            return 'input';
        }
        if (step.id.includes('condition') || step.id.includes('check')) {
            return 'condition';
        }
        if (step.id.includes('ai') || step.id.includes('response')) {
            return 'ai_response';
        }
        
        // Default to message node
        return 'message';
    }

    clearCanvas() {
        if (this.setNodes && this.setEdges) {
            this.setNodes([]);
            this.setEdges([]);
        }
        this.currentFlow = null;
        this.selectedNode = null;
        this.clearPropertiesPanel();
    }

    async saveFlow() {
        if (!this.currentFlow || !this.nodes || !this.edges) {
            this.showNotification('Brak aktywnego flow do zapisania', 'warning');
            return;
        }

        try {
            // Convert nodes back to steps format
            const steps = this.convertNodesToSteps(this.nodes);
            
            // Update flow data
            const updatedFlow = {
                ...this.currentFlow,
                steps: steps,
                updated_at: new Date().toISOString()
            };

            // Save to system (for now just log - later we'll add API endpoint)
            console.log('Saving flow to system:', updatedFlow);
            
            // Show save data for now
            this.showFlowSaveData(updatedFlow);
            
            this.showNotification('Flow zapisany pomyślnie!', 'success');
            
        } catch (error) {
            console.error('Error saving flow:', error);
            this.showNotification('Błąd podczas zapisywania flow', 'error');
        }
    }

    convertNodesToSteps(nodes) {
        return nodes.map(node => {
            const stepData = {
                id: node.id,
                name: node.data.label || node.data.name || node.id,
                description: node.data.description || '',
                required: node.data.required || false,
                next_steps: node.data.next_steps || []
            };

            // Add intent_name if present
            if (node.data.intent_name) {
                stepData.intent_name = node.data.intent_name;
            }

            // Add node-specific properties
            switch (node.data.type) {
                case 'message':
                    if (node.data.message) stepData.message = node.data.message;
                    break;
                case 'input':
                    if (node.data.question) stepData.question = node.data.question;
                    if (node.data.inputType) stepData.input_type = node.data.inputType;
                    break;
                case 'condition':
                    if (node.data.condition) stepData.condition = node.data.condition;
                    break;
            }

            return stepData;
        });
    }

    showFlowSaveData(flowData) {
        // Create modal to show save data
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 80vh;">
                <div class="modal-header">
                    <h3>Flow Data - ${flowData.name}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Dane flow do zapisania w systemie:</p>
                    <textarea readonly style="width: 100%; height: 400px; font-family: monospace; font-size: 12px; background: #1a1a1a; color: #39e575; border: 1px solid #333; border-radius: 4px; padding: 12px;">${JSON.stringify(flowData, null, 2)}</textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="navigator.clipboard.writeText(\`${JSON.stringify(flowData, null, 2).replace(/`/g, '\\`')}\`)">
                        <i class="fas fa-copy"></i>
                        Kopiuj JSON
                    </button>
                    <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">
                        Zamknij
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    testFlow() {
        if (!this.currentFlow) {
            this.showNotification('Wybierz flow do testowania', 'warning');
            return;
        }

        this.showNotification('Funkcja testowania będzie dostępna wkrótce', 'info');
    }

    publishFlow() {
        if (!this.currentFlow) {
            this.showNotification('Wybierz flow do publikacji', 'warning');
            return;
        }

        this.showNotification('Funkcja publikacji będzie dostępna wkrótce', 'info');
    }

    filterNodes(searchTerm) {
        const nodeItems = document.querySelectorAll('.node-item');
        const term = searchTerm.toLowerCase();
        
        nodeItems.forEach(item => {
            const name = item.querySelector('.node-name')?.textContent?.toLowerCase() || '';
            const description = item.querySelector('.node-description')?.textContent?.toLowerCase() || '';
            
            if (name.includes(term) || description.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    goBack() {
        if (window.homepageApp) {
            window.homepageApp.navigateToPage('dashboard');
        } else {
            window.location.href = '/';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: #ffffff;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            animation: slideInRight 0.3s ease forwards;
        `;

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#39e575',
            error: '#ff6b6b',
            warning: '#ffa502',
            info: '#3742fa'
        };
        return colors[type] || '#3742fa';
    }

    // ============ INTENT MANAGEMENT METHODS ============

    switchTab(tabName) {
        // Switch tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[onclick="flowStudio.switchTab('${tabName}')"]`).classList.add('active');
        
        // Switch tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');
        
        if (tabName === 'intents') {
            this.loadIntentLibrary();
        } else if (tabName === 'test') {
            this.initializeTestInterface();
        }
    }

    async loadIntentLibrary() {
        try {
            console.log('🧠 Loading intent library...');
            
            // Load initial data for selectors
            try {
                const [promptsRes, intentsRes] = await Promise.all([
                    window.authManager.makeAuthenticatedRequest('/api/prompt-templates'),
                    window.authManager.makeAuthenticatedRequest('/api/intent-definitions')
                ]);

                if (!promptsRes.ok) throw new Error(`Failed to load prompts: ${promptsRes.statusText}`);
                if (!intentsRes.ok) throw new Error(`Failed to load intents: ${intentsRes.statusText}`);

                this.promptTemplates = await promptsRes.json();
                this.intentTemplates = await intentsRes.json();
            } catch (error) {
                console.error('Error loading intent templates:', error);
                this.promptTemplates = [];
                this.intentTemplates = [];
            }
            
            // Load intent definitions and prompt templates
            const [intentResponse, promptResponse] = await Promise.all([
                window.authManager.makeAuthenticatedRequest('/api/intent-definitions'),
                window.authManager.makeAuthenticatedRequest('/api/prompt-templates')
            ]);

            const intentData = await intentResponse.json();
            const promptData = await promptResponse.json();

            this.intentDefinitions = intentData.intents || [];
            this.promptTemplates = promptData.templates || [];

            // Combine intents from both sources
            this.allIntents = [
                ...this.intentDefinitions.map(intent => ({ ...intent, source: 'definition' })),
                ...this.promptTemplates.map(template => ({ 
                    name: template.intent,
                    description: template.name,
                    keywords: [],
                    source: 'template',
                    template: template
                }))
            ];

            this.renderIntentList();
            this.updateIntentCounts();
            
            console.log(`✅ Loaded ${this.allIntents.length} intents`);
        } catch (error) {
            console.error('❌ Error loading intent library:', error);
            this.showNotification('Błąd ładowania biblioteki intentów', 'error');
        }
    }

    renderIntentList(category = 'all', searchTerm = '') {
        const intentList = document.getElementById('intentList');
        if (!intentList || !this.allIntents) return;

        // Filter intents
        let filteredIntents = this.allIntents;

        if (category !== 'all') {
            filteredIntents = filteredIntents.filter(intent => {
                if (category === 'flow-specific') {
                    return this.isIntentUsedInCurrentFlow(intent.name);
                } else if (category === 'templates') {
                    return intent.source === 'template';
                }
                return true;
            });
        }

        if (searchTerm) {
            filteredIntents = filteredIntents.filter(intent => 
                intent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                intent.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Render intents
        intentList.innerHTML = filteredIntents.map(intent => `
            <div class="intent-item" onclick="flowStudio.selectIntent('${intent.name}')" ondblclick="flowStudio.editIntent('${intent.name}')" data-intent="${intent.name}">
                <div class="intent-header">
                    <span class="intent-name">${intent.name}</span>
                    <div class="intent-badges">
                        <span class="intent-badge ${intent.source}">${intent.source === 'template' ? 'szablon' : 'definicja'}</span>
                        ${this.isIntentUsedInCurrentFlow(intent.name) ? '<span class="intent-badge flow-specific">w flow</span>' : ''}
                    </div>
                </div>
                ${intent.description ? `<div class="intent-description">${intent.description}</div>` : ''}
                ${intent.keywords && intent.keywords.length > 0 ? `
                    <div class="intent-keywords">
                        ${intent.keywords.slice(0, 5).map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
                        ${intent.keywords.length > 5 ? `<span class="keyword-tag">+${intent.keywords.length - 5}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    isIntentUsedInCurrentFlow(intentName) {
        if (!this.nodes || !intentName) return false;
        return this.nodes.some(node => node.data.intent_name === intentName);
    }

    updateIntentCounts() {
        if (!this.allIntents) return;

        const allCount = this.allIntents.length;
        const flowSpecificCount = this.allIntents.filter(intent => this.isIntentUsedInCurrentFlow(intent.name)).length;
        const templateCount = this.allIntents.filter(intent => intent.source === 'template').length;

        document.getElementById('allIntentsCount').textContent = allCount;
        document.getElementById('flowIntentsCount').textContent = flowSpecificCount;
        document.getElementById('templateIntentsCount').textContent = templateCount;
    }

    switchIntentCategory(category) {
        // Update active category
        document.querySelectorAll('.category-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Re-render list
        this.renderIntentList(category);
    }

    filterIntents(searchTerm) {
        const activeCategory = document.querySelector('.category-item.active')?.dataset.category || 'all';
        this.renderIntentList(activeCategory, searchTerm);
    }

    selectIntent(intentName) {
        // Update selected intent
        document.querySelectorAll('.intent-item').forEach(item => item.classList.remove('selected'));
        document.querySelector(`[data-intent="${intentName}"]`)?.classList.add('selected');
        
        // If node is selected, update its intent
        if (this.selectedNode && this.setNodes) {
            this.updateNodeProperty('intent_name', intentName);
        } else {
            this.showNotification('Wybierz węzeł aby przypisać intent', 'info');
        }
    }

    editIntent(intentName) {
        const intent = this.allIntents?.find(i => i.name === intentName);
        if (!intent) {
            this.showNotification('Intent nie został znaleziony', 'error');
            return;
        }

        console.log('🎯 Editing intent:', intent);
        this.currentEditingIntent = intent;
        
        // Update modal title
        document.getElementById('intentModalTitle').textContent = `Edytuj Intent: ${intent.name}`;
        
        // Fill basic info
        document.getElementById('intentName').value = intent.name || '';
        document.getElementById('intentDescription').value = intent.description || '';
        document.getElementById('intentPriority').value = intent.priority || 5;
        document.getElementById('intentRequiresFlow').checked = intent.requires_flow || false;
        
        // Fill prompts (look in both intent definition AND prompt templates)
        let systemPrompt = intent.system_prompt || '';
        let userPrompt = intent.user_prompt_template || '';
        let variables = intent.variables || [];
        
        // If intent has template, use template data
        if (intent.template) {
            systemPrompt = intent.template.system_prompt || systemPrompt;
            userPrompt = intent.template.user_prompt_template || userPrompt;
            variables = intent.template.variables || variables;
        }
        
        // Also check prompt templates by intent name
        const promptTemplate = this.promptTemplates?.find(t => t.intent === intent.name);
        if (promptTemplate) {
            systemPrompt = promptTemplate.system_prompt || systemPrompt;
            userPrompt = promptTemplate.user_prompt_template || userPrompt;
            variables = promptTemplate.variables || variables;
        }
        
        document.getElementById('intentSystemPrompt').value = systemPrompt;
        document.getElementById('intentUserPrompt').value = userPrompt;
        document.getElementById('intentVariables').value = Array.isArray(variables) ? variables.join(', ') : (variables || '');
        
        // Fill keywords
        document.getElementById('intentKeywords').value = Array.isArray(intent.keywords) ? intent.keywords.join(', ') : (intent.keywords || '');
        document.getElementById('intentExamples').value = Array.isArray(intent.examples) ? intent.examples.join('\n') : (intent.examples || '');
        
        // Show modal
        this.showIntentModal();
    }

    showCreateIntentModal() {
        this.currentEditingIntent = null;
        
        // Update modal title
        document.getElementById('intentModalTitle').textContent = 'Nowy Intent';
        
        // Clear all fields
        document.getElementById('intentName').value = '';
        document.getElementById('intentDescription').value = '';
        document.getElementById('intentPriority').value = 5;
        document.getElementById('intentRequiresFlow').checked = false;
        document.getElementById('intentSystemPrompt').value = '';
        document.getElementById('intentUserPrompt').value = '';
        document.getElementById('intentVariables').value = '';
        document.getElementById('intentKeywords').value = '';
        document.getElementById('intentExamples').value = '';
        
        // Hide delete button for new intents
        document.getElementById('deleteIntentBtn').style.display = 'none';
        
        this.showIntentModal();
    }

    showIntentModal() {
        const modal = document.getElementById('intentModalOverlay');
        if (modal) {
            modal.style.display = 'flex';
            
            // Show/hide delete button based on editing state
            const deleteBtn = document.getElementById('deleteIntentBtn');
            if (deleteBtn) {
                deleteBtn.style.display = this.currentEditingIntent ? 'inline-flex' : 'none';
            }
            
            // Setup tab switching
            this.setupIntentModalTabs();
        }
    }

    hideIntentModal() {
        const modal = document.getElementById('intentModalOverlay');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentEditingIntent = null;
    }

    setupIntentModalTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                
                // Update active tab button
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active tab content
                document.querySelectorAll('.intent-tab-content').forEach(content => content.classList.remove('active'));
                document.getElementById(`${tabName}Tab`).classList.add('active');
            });
        });
    }

    saveIntent() {
        const intentData = {
            name: document.getElementById('intentName').value.trim(),
            description: document.getElementById('intentDescription').value.trim(),
            priority: parseInt(document.getElementById('intentPriority').value) || 5,
            requires_flow: document.getElementById('intentRequiresFlow').checked,
            system_prompt: document.getElementById('intentSystemPrompt').value.trim(),
            user_prompt_template: document.getElementById('intentUserPrompt').value.trim(),
            variables: document.getElementById('intentVariables').value.split(',').map(v => v.trim()).filter(v => v),
            keywords: document.getElementById('intentKeywords').value.split(',').map(k => k.trim()).filter(k => k),
            examples: document.getElementById('intentExamples').value.split('\n').map(e => e.trim()).filter(e => e)
        };

        if (!intentData.name) {
            this.showNotification('Nazwa intenta jest wymagana', 'error');
            return;
        }

        console.log('💾 Saving intent:', intentData);
        
        // TODO: Implement actual save to backend
        if (this.currentEditingIntent) {
            this.showNotification(`Intent "${intentData.name}" został zaktualizowany`, 'success');
        } else {
            this.showNotification(`Intent "${intentData.name}" został utworzony`, 'success');
        }
        
        this.hideIntentModal();
        this.loadIntentLibrary(); // Refresh the list
    }

    deleteIntent() {
        if (!this.currentEditingIntent) return;
        
        const intentName = this.currentEditingIntent.name;
        
        if (confirm(`Czy na pewno chcesz usunąć intent "${intentName}"?`)) {
            console.log('🗑️ Deleting intent:', intentName);
            
            // TODO: Implement actual delete from backend
            this.showNotification(`Intent "${intentName}" został usunięty`, 'warning');
            
            this.hideIntentModal();
            this.loadIntentLibrary(); // Refresh the list
        }
    }

    // ============ AI GENERATOR METHODS ============

    async generateSystemPrompt() {
        const button = event.target.closest('.btn-ai-generate');
        const textarea = document.getElementById('intentSystemPrompt');
        const intentName = document.getElementById('intentName').value || 'unknown';
        const description = document.getElementById('intentDescription').value || '';
        
        if (!textarea) return;
        
        button.classList.add('loading');
        button.innerHTML = '<i class="fas fa-spinner"></i>';
        
        try {
            const prompt = `Wygeneruj system prompt dla AI avatara na podstawie:
- Intent: ${intentName}
- Opis: ${description}
- Cel: Instrukcja jak AI ma się zachowywać w tym intencji

Zwróć tylko treść promptu, bez dodatkowych komentarzy.`;

            const response = await this.callAIGenerator(prompt);
            if (response && response.trim()) {
                textarea.value = response.trim();
                this.showNotification('System prompt wygenerowany!', 'success');
            }
        } catch (error) {
            console.error('Error generating system prompt:', error);
            this.showNotification('Błąd generowania system prompt', 'error');
        } finally {
            button.classList.remove('loading');
            button.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }

    async generateUserPrompt() {
        const button = event.target.closest('.btn-ai-generate');
        const textarea = document.getElementById('intentUserPrompt');
        const intentName = document.getElementById('intentName').value || 'unknown';
        const description = document.getElementById('intentDescription').value || '';
        
        if (!textarea) return;
        
        button.classList.add('loading');
        button.innerHTML = '<i class="fas fa-spinner"></i>';
        
        try {
            const prompt = `Wygeneruj user prompt template dla intenta:
- Intent: ${intentName}
- Opis: ${description}
- Cel: Szablon wiadomości użytkownika z {{zmiennymi}}

Uwzględnij zmienne jak {{user_message}}, {{user_name}}, itp.
Zwróć tylko treść template, bez dodatkowych komentarzy.`;

            const response = await this.callAIGenerator(prompt);
            if (response && response.trim()) {
                textarea.value = response.trim();
                this.showNotification('User prompt template wygenerowany!', 'success');
            }
        } catch (error) {
            console.error('Error generating user prompt:', error);
            this.showNotification('Błąd generowania user prompt', 'error');
        } finally {
            button.classList.remove('loading');
            button.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }

    async generateVariables() {
        const button = event.target.closest('.btn-ai-generate');
        const input = document.getElementById('intentVariables');
        const intentName = document.getElementById('intentName').value || 'unknown';
        const description = document.getElementById('intentDescription').value || '';
        
        if (!input) return;
        
        button.classList.add('loading');
        button.innerHTML = '<i class="fas fa-spinner"></i>';
        
        try {
            const prompt = `Wygeneruj listę zmiennych dla intenta:
- Intent: ${intentName}
- Opis: ${description}

Przykłady zmiennych: user_message, user_name, company_name, npc_persona, rag_context, current_time

Zwróć tylko nazwy zmiennych oddzielone przecinkami, bez dodatkowych komentarzy.`;

            const response = await this.callAIGenerator(prompt);
            if (response && response.trim()) {
                input.value = response.trim();
                this.showNotification('Zmienne wygenerowane!', 'success');
            }
        } catch (error) {
            console.error('Error generating variables:', error);
            this.showNotification('Błąd generowania zmiennych', 'error');
        } finally {
            button.classList.remove('loading');
            button.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }

    async generateKeywords() {
        const button = event.target.closest('.btn-ai-generate');
        const textarea = document.getElementById('intentKeywords');
        const intentName = document.getElementById('intentName').value || 'unknown';
        const description = document.getElementById('intentDescription').value || '';
        
        if (!textarea) return;
        
        button.classList.add('loading');
        button.innerHTML = '<i class="fas fa-spinner"></i>';
        
        try {
            const prompt = `Wygeneruj słowa kluczowe i frazy dla intenta:
- Intent: ${intentName}
- Opis: ${description}

Uwzględnij różne warianty, skróty, formalne i nieformalne formy.
Zwróć tylko słowa oddzielone przecinkami, bez dodatkowych komentarzy.`;

            const response = await this.callAIGenerator(prompt);
            if (response && response.trim()) {
                textarea.value = response.trim();
                this.showNotification('Słowa kluczowe wygenerowane!', 'success');
            }
        } catch (error) {
            console.error('Error generating keywords:', error);
            this.showNotification('Błąd generowania słów kluczowych', 'error');
        } finally {
            button.classList.remove('loading');
            button.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }

    async generateExamples() {
        const button = event.target.closest('.btn-ai-generate');
        const textarea = document.getElementById('intentExamples');
        const intentName = document.getElementById('intentName').value || 'unknown';
        const description = document.getElementById('intentDescription').value || '';
        
        if (!textarea) return;
        
        button.classList.add('loading');
        button.innerHTML = '<i class="fas fa-spinner"></i>';
        
        try {
            const prompt = `Wygeneruj przykładowe wypowiedzi użytkownika dla intenta:
- Intent: ${intentName}
- Opis: ${description}

Stwórz 5-8 różnorodnych przykładów jak użytkownik może wyrazić ten intent.
Zwróć każdy przykład w osobnej linii, bez numeracji.`;

            const response = await this.callAIGenerator(prompt);
            if (response && response.trim()) {
                textarea.value = response.trim();
                this.showNotification('Przykłady wygenerowane!', 'success');
            }
        } catch (error) {
            console.error('Error generating examples:', error);
            this.showNotification('Błąd generowania przykładów', 'error');
        } finally {
            button.classList.remove('loading');
            button.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }

    async callAIGenerator(prompt) {
        // Use AuthManager for authenticated requests
        const response = await window.authManager.makeAuthenticatedRequest('/api/personas/generate-content', {
            method: 'POST',
            body: JSON.stringify({
                prompt: prompt,
                type: 'intent_content'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.content || data.message || '';
    }

    // ============ FLOW TYPE SWITCHING ============

    switchFlowType(type) {
        console.log(`🔄 Switching flow type to: ${type}`);
        
        this.currentFlowType = type;
        
        // Update UI
        document.querySelectorAll('.flow-type-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        // Update main container class for styling
        const container = document.querySelector('.flow-studio');
        if (container) {
            container.classList.remove('basic-mode', 'advanced-mode');
            container.classList.add(`${type}-mode`);
        }
        
        // Update header description
        const description = document.querySelector('.header-title p');
        if (description) {
            if (type === 'basic') {
                description.textContent = 'Twórz przepływy konwersacji z prostymi krokami';
            } else {
                description.textContent = 'Buduj zaawansowanych AI agentów z narzędziami i logiką';
            }
        }
        
        // Reload node palette with appropriate nodes
        this.loadNodePalette();
        
        // Show notification
        const typeName = type === 'basic' ? 'Basic Flow' : 'Advanced Agent';
        this.showNotification(`Przełączono na tryb: ${typeName}`, 'info');
    }

    // ============ NODE AI GENERATOR METHODS ============

    async generateNodeSystemPrompt() {
        const button = event.target.closest('.btn-ai-generate');
        const textarea = document.getElementById('nodeSystemPrompt');
        
        if (!textarea || !this.selectedNode) return;
        
        const node = this.selectedNode;
        const nodeType = node.data.type || 'unknown';
        const intentName = node.data.intent_name || 'unknown';
        const description = node.data.description || '';
        
        button.classList.add('loading');
        button.innerHTML = '<i class="fas fa-spinner"></i>';
        
        try {
            const prompt = `Wygeneruj system prompt dla węzła w flow:
- Typ węzła: ${nodeType}
- Intent: ${intentName}
- Opis: ${description}
- Cel: Instrukcja systemowa jak AI ma się zachowywać w tym kroku flow

Uwzględnij specyfikę tego typu węzła i jego rolę w flow.
Zwróć tylko treść promptu, bez dodatkowych komentarzy.`;

            const response = await this.callAIGenerator(prompt);
            if (response && response.trim()) {
                textarea.value = response.trim();
                this.updateNodeProperty('system_prompt', response.trim());
                this.showNotification('System prompt wygenerowany dla węzła!', 'success');
            }
        } catch (error) {
            console.error('Error generating node system prompt:', error);
            this.showNotification('Błąd generowania system prompt', 'error');
        } finally {
            button.classList.remove('loading');
            button.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }

    async generateNodeUserPrompt() {
        const button = event.target.closest('.btn-ai-generate');
        const textarea = document.getElementById('nodeUserPrompt');
        
        if (!textarea || !this.selectedNode) return;
        
        const node = this.selectedNode;
        const nodeType = node.data.type || 'unknown';
        const intentName = node.data.intent_name || 'unknown';
        const description = node.data.description || '';
        
        button.classList.add('loading');
        button.innerHTML = '<i class="fas fa-spinner"></i>';
        
        try {
            const prompt = `Wygeneruj user prompt template dla węzła w flow:
- Typ węzła: ${nodeType}
- Intent: ${intentName}
- Opis: ${description}
- Cel: Template wiadomości użytkownika z {{zmiennymi}}

Uwzględnij zmienne jak {{user_message}}, {{user_name}}, {{npc_persona}}, itp.
Zwróć tylko treść template, bez dodatkowych komentarzy.`;

            const response = await this.callAIGenerator(prompt);
            if (response && response.trim()) {
                textarea.value = response.trim();
                this.updateNodeProperty('user_prompt_template', response.trim());
                this.showNotification('User prompt template wygenerowany dla węzła!', 'success');
            }
        } catch (error) {
            console.error('Error generating node user prompt:', error);
            this.showNotification('Błąd generowania user prompt', 'error');
        } finally {
            button.classList.remove('loading');
            button.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }

    async generateNodeVariables() {
        const button = event.target.closest('.btn-ai-generate');
        const input = document.getElementById('nodeVariables');
        
        if (!input || !this.selectedNode) return;
        
        const node = this.selectedNode;
        const nodeType = node.data.type || 'unknown';
        const intentName = node.data.intent_name || 'unknown';
        const description = node.data.description || '';
        
        button.classList.add('loading');
        button.innerHTML = '<i class="fas fa-spinner"></i>';
        
        try {
            const prompt = `Wygeneruj listę zmiennych dla węzła w flow:
- Typ węzła: ${nodeType}
- Intent: ${intentName}
- Opis: ${description}

Przykłady zmiennych: user_message, user_name, company_name, npc_persona, rag_context, current_time, step_result

Zwróć tylko nazwy zmiennych oddzielone przecinkami, bez dodatkowych komentarzy.`;

            const response = await this.callAIGenerator(prompt);
            if (response && response.trim()) {
                const variables = response.trim().split(',').map(s => s.trim()).filter(s => s);
                input.value = variables.join(', ');
                this.updateNodeProperty('variables', variables);
                this.showNotification('Zmienne wygenerowane dla węzła!', 'success');
            }
        } catch (error) {
            console.error('Error generating node variables:', error);
            this.showNotification('Błąd generowania zmiennych', 'error');
        } finally {
            button.classList.remove('loading');
            button.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }

    // ============ FLOW TESTING INTERFACE METHODS ============

    initializeTestInterface() {
        console.log('🧪 Initializing Test Interface...');
        
        // Initialize test session
        this.testSession = {
            isActive: false,
            startTime: null,
            messages: [],
            executionSteps: [],
            intentResults: [],
            currentStep: null
        };
        
        // Bind test interface events
        this.bindTestEvents();
        
        // Small delay to ensure ReactFlow is loaded
        setTimeout(() => {
            console.log('🔄 Checking ReactFlow instance:', this.reactFlowInstance);
            // Check if we have a valid flow to test
            this.validateFlowForTesting();
        }, 500);
    }
    
    bindTestEvents() {
        // Start Test button
        const startTestBtn = document.getElementById('startTestBtn');
        if (startTestBtn) {
            startTestBtn.addEventListener('click', () => this.startFlowTest());
        }
        
        // Send Test Message button
        const sendTestBtn = document.getElementById('sendTestMessageBtn');
        if (sendTestBtn) {
            sendTestBtn.addEventListener('click', () => this.sendTestMessage());
        }
        
        // Test Message Input (Enter key)
        const testInput = document.getElementById('testMessageInput');
        if (testInput) {
            testInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !testInput.disabled) {
                    this.sendTestMessage();
                }
            });
        }
        
        // Clear Test button
        const clearTestBtn = document.getElementById('clearTestBtn');
        if (clearTestBtn) {
            clearTestBtn.addEventListener('click', () => this.clearTestSession());
        }
        
        // Export Test button
        const exportTestBtn = document.getElementById('exportTestBtn');
        if (exportTestBtn) {
            exportTestBtn.addEventListener('click', () => this.exportTestResults());
        }
    }
    
    validateFlowForTesting() {
        const nodes = this.reactFlowInstance?.getNodes() || [];
        
        console.log('🔍 Validating flow for testing. Nodes found:', nodes.length, nodes);
        
        if (nodes.length === 0) {
            console.warn('⚠️ No nodes found in flow for testing');
            this.showTestError('Brak węzłów w flow. Dodaj węzły aby móc testować.');
            return false;
        }
        
        console.log('✅ Flow validation passed');
        this.updateTestStatus('Gotowy do testu', 'ready');
        return true;
    }
    
    startFlowTest() {
        console.log('🚀 Starting flow test...');
        
        if (!this.validateFlowForTesting()) {
            console.error('❌ Flow validation failed - cannot start test');
            return;
        }
        
        console.log('✅ Flow validation passed - starting test session');
        
        // Initialize test session
        this.testSession = {
            isActive: true,
            startTime: new Date(),
            messages: [],
            executionSteps: [],
            intentResults: [],
            currentStep: null
        };
        
        // Update UI
        this.updateTestStatus('Test aktywny', 'testing');
        
        const testInput = document.getElementById('testMessageInput');
        const sendBtn = document.getElementById('sendTestMessageBtn');
        const startBtn = document.getElementById('startTestBtn');
        const exportBtn = document.getElementById('exportTestBtn');
        
        if (testInput) {
            testInput.disabled = false;
            console.log('✅ Test input enabled');
        } else {
            console.error('❌ Test input not found');
        }
        
        if (sendBtn) {
            sendBtn.disabled = false;
            console.log('✅ Send button enabled');
        } else {
            console.error('❌ Send button not found');
        }
        
        if (startBtn) {
            startBtn.disabled = true;
            console.log('✅ Start button disabled');
        }
        
        if (exportBtn) {
            exportBtn.disabled = false;
            console.log('✅ Export button enabled');
        }
        
        // Clear previous test data
        this.clearTestDisplays();
        
        // Start with greeting
        this.addTestMessage('bot', 'Test flow rozpoczęty! Napisz wiadomość aby przetestować reakcje avatara.');
        
        console.log('🚀 Flow test started successfully');
    }
    
    sendTestMessage() {
        const input = document.getElementById('testMessageInput');
        const message = input.value.trim();
        
        if (!message || !this.testSession.isActive) {
            return;
        }
        
        // Add user message to chat
        this.addTestMessage('user', message);
        
        // Clear input
        input.value = '';
        
        // Process message and simulate response
        this.processTestMessage(message);
    }
    
    async processTestMessage(message) {
        console.log('🔍 Processing test message:', message);
        
        try {
            // Use REAL intent detection from production system
            const detectedIntent = await this.classifyIntentWithAPI(message);
            
            // Find matching node
            const nodes = this.reactFlowInstance?.getNodes() || [];
            const matchingNode = this.findMatchingNode(nodes, message, detectedIntent);
            
            if (matchingNode) {
                setTimeout(() => {
                    this.executeNode(matchingNode, message);
                }, 500);
            } else {
                setTimeout(() => {
                    this.addTestMessage('bot', 'Nie znalazłem odpowiedniego węzła dla tej wiadomości. Spróbuj innej frazy.');
                }, 500);
            }
        } catch (error) {
            console.error('❌ Error processing test message:', error);
            setTimeout(() => {
                this.addTestMessage('bot', `Błąd przetwarzania wiadomości: ${error.message}`);
            }, 500);
        }
    }
    
    findMatchingNode(nodes, message, detectedIntent) {
        console.log('🔍 Finding matching node for intent:', detectedIntent);
        console.log('🔍 Available nodes:', nodes.map(n => ({
            id: n.id, 
            type: n.type, 
            intent_name: n.data?.intent_name,
            label: n.data?.label
        })));
        
        // Try to find node by intent
        let matchingNode = nodes.find(node => {
            const nodeData = node.data || {};
            return nodeData.intent_name === detectedIntent;
        });
        
        console.log('🔍 Intent match result:', matchingNode?.id || 'none');
        
        // If no intent match, try first available message node
        if (!matchingNode) {
            matchingNode = nodes.find(node => node.type === 'message');
            console.log('🔍 Message node fallback:', matchingNode?.id || 'none');
        }
        
        // If still no match, try first node with system_prompt (conversational node)
        if (!matchingNode) {
            matchingNode = nodes.find(node => node.data?.system_prompt);
            console.log('🔍 System prompt fallback:', matchingNode?.id || 'none');
        }
        
        // Last resort - first node
        if (!matchingNode && nodes.length > 0) {
            matchingNode = nodes[0];
            console.log('🔍 First node fallback:', matchingNode?.id || 'none');
        }
        
        return matchingNode;
    }
    
    executeNode(node, userMessage) {
        console.log(`🎯 Executing node: ${node.id}`, node);
        
        // Add execution step
        const step = {
            id: `step-${Date.now()}`,
            nodeId: node.id,
            nodeName: node.data?.label || node.id,
            nodeType: node.type,
            userInput: userMessage,
            timestamp: new Date(),
            status: 'completed'
        };
        
        this.testSession.executionSteps.push(step);
        this.testSession.currentStep = step;
        
        // Update execution tracker UI
        this.updateExecutionTracker();
        
        // Simulate node response
        this.simulateNodeResponse(node);
        
        // Update test statistics
        this.updateTestStatistics();
    }
    
    simulateNodeResponse(node) {
        const nodeData = node.data || {};
        let response = '';
        
        // Generate response based on node content
        if (nodeData.system_prompt) {
            response = `${nodeData.system_prompt}`;
        } else if (nodeData.message) {
            response = nodeData.message;
        } else {
            response = `Przykładowa odpowiedź z węzła: ${nodeData.label || node.id}`;
        }
        
        // Add bot message to chat
        this.addTestMessage('bot', response, {
            nodeId: node.id,
            nodeType: node.type,
            executedAt: new Date()
        });
    }
    
    async classifyIntentWithAPI(input) {
        console.log('🧪 Using REAL intent classifier for:', input);
        
        try {
            // Get current avatar info from the loaded flow
            const avatarType = this.currentFlow?.avatar_type || 'networker';
            const avatarId = this.currentFlow?.avatar_id || null;
            
            console.log('🎯 Avatar context:', { avatarType, avatarId });
            
            // Call the real intent classification API
            const response = await fetch('/api/classify-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_message: input,
                    avatar_type: avatarType,
                    avatar_id: avatarId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Real intent classification result:', result);
            
            // Add intent result to test session
            const intentResult = {
                intent: result.intent,
                confidence: result.confidence,
                entities: result.entities || {},
                requires_flow: result.requires_flow,
                flow_name: result.flow_name,
                input: input,
                timestamp: new Date(),
                source: 'production_api'
            };
            
            this.testSession.intentResults.push(intentResult);
            this.updateIntentMonitor();
            
            return result.intent;
            
        } catch (error) {
            console.error('❌ Error calling real intent classifier:', error);
            
            // Fallback to simulation if API fails
            console.log('⚠️ Falling back to simulation...');
            return this.simulateIntentDetection(input);
        }
    }

    simulateIntentDetection(input) {
        let detectedIntent = 'unknown';
        let confidence = Math.random() * 0.4 + 0.6; // 0.6-1.0
        
        // Enhanced intent detection simulation (fallback only)
        const intentKeywords = {
            greeting: ['cześć', 'witaj', 'hej', 'hello', 'dzień dobry'],
            help: ['pomoc', 'help', 'pomóż', 'wsparcie'],
            question: ['co', 'jak', 'gdzie', 'kiedy', 'dlaczego', '?'],
            goodbye: ['pa', 'bye', 'żegnaj', 'do widzenia'],
            thanks: ['dzięki', 'dziękuję', 'thank'],
            // Business-related intents
            company_info: ['firma', 'firmie', 'company', 'organizacja', 'przedsiębiorstwo', 'o was', 'o tobie'],
            services: ['usługi', 'services', 'oferujecie', 'robicie', 'świadczycie'],
            about: ['opowiedz', 'powiedz', 'przedstaw', 'about', 'kim jesteś', 'czym się zajmujecie'],
            contact: ['kontakt', 'contact', 'telefon', 'email', 'adres', 'spotkanie'],
            business_model: ['model', 'działanie', 'business', 'jak działacie', 'sposób pracy']
        };
        
        const lowerInput = input.toLowerCase();
        
        for (const [intent, keywords] of Object.entries(intentKeywords)) {
            if (keywords.some(keyword => lowerInput.includes(keyword))) {
                detectedIntent = intent;
                confidence = Math.random() * 0.2 + 0.8; // 0.8-1.0 for matches
                break;
            }
        }
        
        // Add intent result
        const intentResult = {
            intent: detectedIntent,
            confidence: confidence,
            input: input,
            timestamp: new Date(),
            source: 'simulation_fallback'
        };
        
        this.testSession.intentResults.push(intentResult);
        this.updateIntentMonitor();
        
        return detectedIntent;
    }
    
    addTestMessage(sender, text, metadata = {}) {
        const message = {
            id: `msg-${Date.now()}`,
            sender: sender,
            text: text,
            timestamp: new Date(),
            metadata: metadata
        };
        
        this.testSession.messages.push(message);
        this.updateChatDisplay();
    }
    
    updateChatDisplay() {
        const chatContainer = document.getElementById('testChatMessages');
        if (!chatContainer) return;
        
        // Clear system message if this is first real message
        if (this.testSession.messages.length === 1) {
            chatContainer.innerHTML = '';
        }
        
        // Add new messages
        this.testSession.messages.forEach(message => {
            if (!chatContainer.querySelector(`[data-message-id="${message.id}"]`)) {
                const messageElement = this.createMessageElement(message);
                chatContainer.appendChild(messageElement);
            }
        });
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `test-message ${message.sender}`;
        div.setAttribute('data-message-id', message.id);
        
        div.innerHTML = `
            <p class="message-text">${message.text}</p>
            <div class="message-meta">
                ${message.timestamp.toLocaleTimeString()}
                ${message.metadata?.nodeId ? `• Node: ${message.metadata.nodeId}` : ''}
            </div>
        `;
        
        return div;
    }
    
    updateExecutionTracker() {
        const stepsContainer = document.getElementById('executionSteps');
        if (!stepsContainer) return;
        
        if (this.testSession.executionSteps.length === 0) {
            stepsContainer.innerHTML = `
                <div class="no-execution">
                    <i class="fas fa-route"></i>
                    <p>Brak aktywnego testu</p>
                </div>
            `;
            return;
        }
        
        stepsContainer.innerHTML = '';
        
        this.testSession.executionSteps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'execution-step';
            
            stepElement.innerHTML = `
                <div class="step-icon completed">
                    ${index + 1}
                </div>
                <div class="step-details">
                    <p class="step-name">${step.nodeName}</p>
                    <p class="step-description">
                        ${step.nodeType} • ${step.timestamp.toLocaleTimeString()}
                    </p>
                </div>
            `;
            
            stepsContainer.appendChild(stepElement);
        });
        
        stepsContainer.scrollTop = stepsContainer.scrollHeight;
    }
    
    updateIntentMonitor() {
        const intentContainer = document.getElementById('intentResults');
        if (!intentContainer) return;
        
        if (this.testSession.intentResults.length === 0) {
            intentContainer.innerHTML = `
                <div class="no-intent-data">
                    <i class="fas fa-brain"></i>
                    <p>Brak danych o intentach</p>
                </div>
            `;
            return;
        }
        
        intentContainer.innerHTML = '';
        
        // Show last 3 intent results
        const recentIntents = this.testSession.intentResults.slice(-3);
        
        recentIntents.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'intent-result';
            
            const confidenceClass = result.confidence > 0.8 ? 'high' : 
                                  result.confidence > 0.6 ? 'medium' : 'low';
            
            const sourceIcon = result.source === 'production_api' ? 
                '<i class="fas fa-robot" title="Production API" style="color: #00ff88;"></i>' : 
                '<i class="fas fa-code" title="Simulation Fallback" style="color: #ffa500;"></i>';
            
            resultElement.innerHTML = `
                <div class="intent-name">
                    ${sourceIcon} ${result.intent}
                    ${result.requires_flow ? '<i class="fas fa-sitemap" title="Requires Flow" style="margin-left: 5px;"></i>' : ''}
                </div>
                <div class="intent-confidence ${confidenceClass}">
                    ${Math.round(result.confidence * 100)}%
                </div>
            `;
            
            intentContainer.appendChild(resultElement);
        });
    }
    
    updateTestStatistics() {
        document.getElementById('stepsCount').textContent = this.testSession.executionSteps.length;
        document.getElementById('intentsCount').textContent = this.testSession.intentResults.length;
        
        if (this.testSession.startTime) {
            const duration = Math.round((new Date() - this.testSession.startTime) / 1000);
            document.getElementById('testDuration').textContent = `${duration}s`;
        }
    }
    
    clearTestSession() {
        if (confirm('Czy na pewno chcesz wyczyścić sesję testową?')) {
            this.testSession = {
                isActive: false,
                startTime: null,
                messages: [],
                executionSteps: [],
                intentResults: [],
                currentStep: null
            };
            
            this.clearTestDisplays();
            this.updateTestStatus('Gotowy do testu', 'ready');
            
            // Reset UI
            document.getElementById('testMessageInput').disabled = true;
            document.getElementById('sendTestMessageBtn').disabled = true;
            document.getElementById('startTestBtn').disabled = false;
            document.getElementById('exportTestBtn').disabled = true;
            
            console.log('🧹 Test session cleared');
        }
    }
    
    clearTestDisplays() {
        // Clear chat
        const chatContainer = document.getElementById('testChatMessages');
        if (chatContainer) {
            chatContainer.innerHTML = `
                <div class="system-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Wprowadź wiadomość testową aby przetestować flow</p>
                </div>
            `;
        }
        
        // Clear execution tracker
        this.updateExecutionTracker();
        
        // Clear intent monitor
        this.updateIntentMonitor();
        
        // Reset statistics
        document.getElementById('stepsCount').textContent = '0';
        document.getElementById('intentsCount').textContent = '0';
        document.getElementById('testDuration').textContent = '0s';
    }
    
    exportTestResults() {
        if (!this.testSession.isActive && this.testSession.messages.length === 0) {
            alert('Brak danych testowych do eksportu.');
            return;
        }
        
        const testData = {
            flowName: this.currentFlow?.name || 'Unnamed Flow',
            testSession: this.testSession,
            exportedAt: new Date().toISOString(),
            summary: {
                totalMessages: this.testSession.messages.length,
                executionSteps: this.testSession.executionSteps.length,
                intentResults: this.testSession.intentResults.length,
                duration: this.testSession.startTime ? 
                    Math.round((new Date() - this.testSession.startTime) / 1000) : 0
            }
        };
        
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(testData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flow-test-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📤 Test results exported');
    }
    
    updateTestStatus(message, status = 'ready') {
        const statusElement = document.getElementById('testStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-indicator ${status}`;
        }
    }
    
    showTestError(message) {
        this.updateTestStatus(message, 'error');
        console.error('❌ Test Error:', message);
    }
}

// Global instance
let flowStudio;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    flowStudio = new FlowStudio();
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        .flow-node {
            transition: all 0.3s ease;
        }
        
        .flow-node:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(57, 229, 117, 0.4);
        }
    `;
    document.head.appendChild(style);
});

// Export for global access
window.flowStudio = flowStudio;
