// ZoomableFlowCreator - kopia ZoomableFlowEditor z ustawieniami tylko dla Creator/Manager
const ZoomableFlowCreator = ({
                                 flowDefinitions = [], activeFlow = null, currentStep = null, onNodeClick = () => {
    }, editable = true, avatar = null
                             }) => {
    const [nodes, setNodes, onNodesChange] = window.ReactFlow.useNodesState([]);
    const [edges, setEdges, onEdgesChange] = window.ReactFlow.useEdgesState([]);
    const reactFlowInstance = React.useRef(null);

    React.useEffect(() => {
        if (!flowDefinitions.length) {
            setNodes([]);
            return;
        }
        const flowNodes = [];
        let yOffset = 20;

        flowDefinitions.forEach((flow) => {
            // CREATE FLOW HEADER NODE (jak w dashboardzie)
            const flowHeaderNode = {
                id: `flow-header-${flow.id}`,
                type: 'flowHeader',
                position: {x: 20, y: yOffset},
                data: {
                    flow,
                    isActive: true,
                    title: flow.name,
                    stepCount: (flow.steps || []).length,
                    description: flow.description || ''
                },
                draggable: false,
                selectable: false
            };
            flowNodes.push(flowHeaderNode);
            yOffset += 80; // Add spacing after header

            // CREATE STEP NODES (dokładnie jak w dashboardzie - bez baseY)
            const steps = flow.steps || [];
            let xOffset = 20;

            steps.forEach((step) => {
                flowNodes.push({
                    id: `${flow.id}-${step.id}`,
                    type: 'cardNode',
                    position: {x: xOffset, y: yOffset}, // Używamy yOffset jak w dashboardzie!
                    data: {
                        step,
                        flow,
                        isActive: true,
                        isCurrentStep: currentStep === step.id,
                        usesRAG: false,
                        title: step.name || step.id,
                        description: step.description || '',
                        required: !!step.required,
                        next_steps: step.next_steps || [],
                        intent_name: step.intent_name || ''
                    },
                    draggable: true, // Przywróć przeciąganie węzłów
                    selectable: true
                });
                xOffset += 320; // 260px width + 60px gap (więcej miejsca!)
            });

            yOffset += 200; // Add spacing between flows (jak w dashboardzie)
        });

        // DEBUG: Sprawdźmy jakie pozycje są ustawiane (BEZ normalizacji!)
        console.log('ZoomableFlowCreator: Setting node positions (simplified):', flowNodes.map(n => ({
            id: n.id,
            type: n.type,
            x: n.position.x,
            y: n.position.y
        })));

        setNodes(flowNodes); // Używamy oryginalnych pozycji bez normalizacji!
    }, [flowDefinitions, activeFlow, currentStep]);

    const nodeTypes = React.useMemo(() => ({
        flowHeader: ({data}) => React.createElement('div', {
            style: {
                padding: '12px 20px',
                borderRadius: '8px',
                background: '#22c55e',
                color: '#fff',
                minWidth: '400px',
                border: '2px solid #16a34a',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                userSelect: 'none',
                pointerEvents: 'none'
            }
        }, [
            React.createElement('div', {key: 'row', style: {display: 'flex', alignItems: 'center', gap: '12px'}}, [
                React.createElement('div', {
                    key: 'dot',
                    style: {width: '12px', height: '12px', borderRadius: '50%', background: '#16a34a'}
                }),
                React.createElement('h3', {
                    key: 'title',
                    style: {margin: 0, fontSize: '16px', fontWeight: 'bold'}
                }, data.title),
                React.createElement('span', {
                    key: 'count',
                    style: {
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.2)',
                        fontSize: '12px'
                    }
                }, `${data.stepCount} steps`),
                React.createElement('span', {
                    key: 'active',
                    style: {
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: '#16a34a',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }
                }, 'ACTIVE')
            ])
        ]),
        cardNode: ({data}) => React.createElement('div', {
            style: {
                width: '260px',
                minHeight: '120px',
                background: '#1e3a8a',
                border: '2px solid #1e40af',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                pointerEvents: 'all',
                boxSizing: 'border-box'
            }
        }, [
            React.createElement('div', {
                key: 'hdr',
                style: {display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}
            }, [
                React.createElement('h4', {
                    key: 't',
                    style: {color: '#dbeafe', fontSize: '14px', fontWeight: 'bold', margin: 0, flex: 1}
                }, data.step.name || data.step.id),
                React.createElement('span', {
                    key: 'req',
                    style: {
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        background: data.required ? '#dc2626' : '#6b7280',
                        color: '#fff',
                        fontWeight: 'bold'
                    }
                }, data.required ? 'REQ' : 'OPT')
            ]),
            React.createElement('p', {
                key: 'desc',
                style: {color: '#93c5fd', fontSize: '12px', margin: '8px 0', lineHeight: 1.4}
            }, data.description || 'No description')
        ])
    }), []);

    return React.createElement('div', {style: {width: '100%', height: '600px'}}, [
        React.createElement('div', {
                key: 'canvas',
                style: {width: '100%', height: '100%', background: '#0d1117', borderRadius: '8px'}
            },
            React.createElement(window.ReactFlow.default, {
                key: 'creator-reactflow', nodes, edges: [], onNodesChange, onEdgesChange,
                onNodeClick: (e, n) => onNodeClick(n.data), nodeTypes,
                onInit: (inst) => {
                    reactFlowInstance.current = inst;
                    console.log('ReactFlow initialized with viewport:', inst.getViewport());
                    // DEBUG: Sprawdź pozycje węzłów po inicjalizacji
                    setTimeout(() => {
                        const rfNodes = inst.getNodes();
                        console.log('ReactFlow actual node positions after init:', rfNodes.map(n => ({
                            id: n.id, x: n.position.x, y: n.position.y
                        })));
                    }, 100);
                },
                fitView: false, minZoom: 0.1, maxZoom: 3,
                defaultViewport: {x: 0, y: 0, zoom: 1.3},
                translateExtent: [[-Infinity, -Infinity], [Infinity, Infinity]],
                nodeExtent: [[-Infinity, -Infinity], [Infinity, Infinity]],
                // WYŁĄCZAMY AUTOMATYCZNE UKŁADY ALE ZOSTAWIAMY DRAGGABLE
                nodesDraggable: true, // Przywróć przeciąganie
                nodesConnectable: false,
                elementsSelectable: true,
                preventScrolling: false,
                zoomOnDoubleClick: false,
                // KLUCZOWE: Wyłącz automatyczny layout!
                nodeOrigin: [0, 0], // Pozycjonowanie od lewego górnego rogu
                snapToGrid: false, // Bez przyciągania do siatki
                snapGrid: [1, 1], // Minimalna siatka
                style: {backgroundColor: '#0d1117'}, panOnDrag: true, zoomOnScroll: true
            })
        )
    ]);
};

window.ZoomableFlowCreator = ZoomableFlowCreator;


