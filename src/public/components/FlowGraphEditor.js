// FlowGraphEditor.js - Professional ReactFlow-based Flow Editor for AI Avatar System
// Based on district-app DialogGraph architecture

const FlowGraphEditor = (() => {
    // Import ReactFlow from CDN (will be loaded in HTML)
    const {
        ReactFlow,
        Controls,
        Background,
        useNodesState,
        useEdgesState,
        addEdge,
        MarkerType,
    } = window.ReactFlow || {};

    // Fallback for MarkerType if not available
    const ArrowClosed = MarkerType?.ArrowClosed || 'arrowclosed';
    console.log('🔍 FlowGraphEditor: ArrowClosed value:', ArrowClosed, 'MarkerType:', !!MarkerType);

    // Custom Node Types for AI Avatar Flows
    const nodeTypes = {
        start: ({data, selected}) => React.createElement('div', {
            className: `flow-node flow-node-start ${selected ? 'selected' : ''}`,
            style: {
                padding: '12px 20px',
                borderRadius: '25px',
                backgroundColor: '#22c55e',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                border: selected ? '2px solid #fff' : 'none',
                minWidth: '120px',
                textAlign: 'center'
            }
        }, [
            React.createElement('div', {key: 'title', style: {fontSize: '14px'}}, data.title || 'Start'),
            data.entry_intents && React.createElement('div', {
                key: 'intents',
                style: {fontSize: '10px', opacity: 0.8, marginTop: '4px'}
            }, `Intents: ${data.entry_intents.join(', ')}`)
        ]),

        intent: ({data, selected}) => React.createElement('div', {
            className: `flow-node flow-node-intent ${selected ? 'selected' : ''}`,
            style: {
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#3b82f6',
                color: 'white',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                border: selected ? '2px solid #fff' : 'none',
                minWidth: '200px',
                maxWidth: '250px'
            }
        }, [
            React.createElement('div', {
                key: 'title',
                style: {fontWeight: 'bold', fontSize: '13px', marginBottom: '4px'}
            }, data.title || 'Intent Step'),
            React.createElement('div', {
                key: 'intent',
                style: {fontSize: '11px', opacity: 0.9}
            }, data.intent_name || 'No intent'),
            data.confidence && React.createElement('div', {
                key: 'confidence',
                style: {fontSize: '10px', opacity: 0.7, marginTop: '2px'}
            }, `Confidence: ${data.confidence}`)
        ]),

        response: ({data, selected}) => React.createElement('div', {
            className: `flow-node flow-node-response ${selected ? 'selected' : ''}`,
            style: {
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#f59e0b',
                color: 'white',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                border: selected ? '2px solid #fff' : 'none',
                minWidth: '150px',
                maxWidth: '220px'
            }
        }, [
            React.createElement('div', {
                key: 'title',
                style: {fontWeight: 'bold', fontSize: '13px', marginBottom: '4px'}
            }, data.title || 'AI Response'),
            React.createElement('div', {
                key: 'content',
                style: {fontSize: '11px', opacity: 0.9, lineHeight: '1.3'}
            }, data.system_prompt ? data.system_prompt.substring(0, 60) + '...' : 'No prompt'),
            data.required && React.createElement('div', {
                key: 'required',
                style: {fontSize: '10px', opacity: 0.7, marginTop: '2px'}
            }, 'Required: ✓')
        ]),

        condition: ({data, selected}) => React.createElement('div', {
            className: `flow-node flow-node-condition ${selected ? 'selected' : ''}`,
            style: {
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                border: selected ? '2px solid #fff' : 'none',
                minWidth: '140px',
                transform: 'rotate(45deg)',
                transformOrigin: 'center'
            }
        }, [
            React.createElement('div', {
                key: 'title',
                style: {
                    fontWeight: 'bold',
                    fontSize: '12px',
                    transform: 'rotate(-45deg)',
                    textAlign: 'center'
                }
            }, data.title || 'Condition'),
            data.conditions && React.createElement('div', {
                key: 'conditions',
                style: {
                    fontSize: '10px',
                    opacity: 0.8,
                    marginTop: '2px',
                    transform: 'rotate(-45deg)',
                    textAlign: 'center'
                }
            }, `${data.conditions.length} rules`)
        ]),

        memory: ({data, selected}) => React.createElement('div', {
            className: `flow-node flow-node-memory ${selected ? 'selected' : ''}`,
            style: {
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#ec4899',
                color: 'white',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                border: selected ? '2px solid #fff' : 'none',
                minWidth: '150px'
            }
        }, [
            React.createElement('div', {
                key: 'title',
                style: {fontWeight: 'bold', fontSize: '13px', marginBottom: '4px'}
            }, data.title || 'Memory Op'),
            React.createElement('div', {
                key: 'operation',
                style: {fontSize: '11px', opacity: 0.9}
            }, data.memory_operation || 'Store context'),
            data.memory_key && React.createElement('div', {
                key: 'key',
                style: {fontSize: '10px', opacity: 0.7, marginTop: '2px'}
            }, `Key: ${data.memory_key}`)
        ]),

        knowledge: ({data, selected}) => React.createElement('div', {
            className: `flow-node flow-node-knowledge ${selected ? 'selected' : ''}`,
            style: {
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#eab308',
                color: 'white',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                border: selected ? '2px solid #fff' : 'none',
                minWidth: '150px'
            }
        }, [
            React.createElement('div', {
                key: 'title',
                style: {fontWeight: 'bold', fontSize: '13px', marginBottom: '4px'}
            }, data.title || 'Knowledge'),
            React.createElement('div', {
                key: 'source',
                style: {fontSize: '11px', opacity: 0.9}
            }, data.knowledge_source || 'RAG Query'),
            data.vector_search && React.createElement('div', {
                key: 'vector',
                style: {fontSize: '10px', opacity: 0.7, marginTop: '2px'}
            }, 'Vector Search: ✓')
        ]),

        end: ({data, selected}) => React.createElement('div', {
            className: `flow-node flow-node-end ${selected ? 'selected' : ''}`,
            style: {
                padding: '12px 20px',
                borderRadius: '25px',
                backgroundColor: '#ef4444',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                border: selected ? '2px solid #fff' : 'none',
                minWidth: '120px',
                textAlign: 'center'
            }
        }, [
            React.createElement('div', {key: 'title', style: {fontSize: '14px'}}, data.title || 'End'),
            data.success_criteria && React.createElement('div', {
                key: 'criteria',
                style: {fontSize: '10px', opacity: 0.8, marginTop: '4px'}
            }, 'Success criteria defined')
        ])
    };

    // Main FlowGraphEditor Component
    const FlowGraphEditor = ({
                                 flowDefinitions = [], activeFlow = null, onNodeClick = () => {
        }, editable = false
                             }) => {
        const [nodes, setNodes, onNodesChange] = useNodesState([]);
        const [edges, setEdges, onEdgesChange] = useEdgesState([]);
        const [selectedNode, setSelectedNode] = React.useState(null);
        const [showNodeDialog, setShowNodeDialog] = React.useState(false);
        const [editingNode, setEditingNode] = React.useState(null);
        const [promptTemplates, setPromptTemplates] = React.useState([]);
        const [intentDefinitions, setIntentDefinitions] = React.useState([]);

        // Load prompt templates and intent definitions
        React.useEffect(() => {
            const loadTemplatesAndIntents = async () => {
                try {
                    console.log('🔄 FlowGraphEditor: Loading prompt templates and intents...');

                    // Load prompt templates
                    const promptResponse = await fetch('/api/prompt-templates');
                    console.log('🔍 FlowGraphEditor: Prompt templates response status:', promptResponse.status);
                    if (promptResponse.ok) {
                        const promptData = await promptResponse.json();
                        console.log('🔍 FlowGraphEditor: Prompt templates data:', promptData);
                        setPromptTemplates(promptData.templates || []);
                        console.log('✅ FlowGraphEditor: Loaded', promptData.templates?.length || 0, 'prompt templates');
                        console.log('🔍 FlowGraphEditor: Sample template:', promptData.templates?.[0]);
                    } else {
                        console.error('❌ FlowGraphEditor: Failed to load prompt templates:', promptResponse.status);
                    }

                    // Load intent definitions
                    const intentResponse = await fetch('/api/intent-definitions');
                    console.log('🔍 FlowGraphEditor: Intent definitions response status:', intentResponse.status);
                    if (intentResponse.ok) {
                        const intentData = await intentResponse.json();
                        console.log('🔍 FlowGraphEditor: Intent definitions data:', intentData);
                        setIntentDefinitions(intentData.intents || []);
                        console.log('✅ FlowGraphEditor: Loaded', intentData.intents?.length || 0, 'intent definitions');
                        console.log('🔍 FlowGraphEditor: Sample intent:', intentData.intents?.[0]);
                    } else {
                        console.error('❌ FlowGraphEditor: Failed to load intent definitions:', intentResponse.status);
                    }
                } catch (error) {
                    console.error('❌ FlowGraphEditor: Error loading templates/intents:', error);

                    // Fallback data for testing
                    console.log('🔧 FlowGraphEditor: Using fallback data for testing');
                    setPromptTemplates([
                        {
                            id: 'greeting_template',
                            intent: 'greeting',
                            system_prompt: 'Test system prompt for greeting',
                            user_prompt_template: 'Test user prompt: {{user_message}}'
                        },
                        {
                            id: 'company_overview_template',
                            intent: 'company_overview',
                            system_prompt: 'Test system prompt for company overview',
                            user_prompt_template: 'Test company prompt: {{user_message}}'
                        }
                    ]);

                    setIntentDefinitions([
                        {
                            name: 'greeting',
                            description: 'Test greeting intent',
                            keywords: ['hello', 'hi'],
                            examples: ['Hello there', 'Hi how are you']
                        },
                        {
                            name: 'company_overview',
                            description: 'Test company overview intent',
                            keywords: ['company', 'overview'],
                            examples: ['Tell me about your company']
                        }
                    ]);
                }
            };

            loadTemplatesAndIntents();
        }, []);

        // Convert flow definitions to ReactFlow format
        React.useEffect(() => {
            if (!flowDefinitions || flowDefinitions.length === 0) {
                setNodes([]);
                setEdges([]);
                return;
            }

            // Prevent infinite loop - only process when we have data
            if (!promptTemplates || !intentDefinitions) {
                console.log('🔄 FlowGraphEditor: Waiting for templates/intents...', {
                    promptTemplates: promptTemplates?.length || 0,
                    intentDefinitions: intentDefinitions?.length || 0
                });
                return;
            }

            console.log('🎯 FlowGraphEditor: Converting flows to ReactFlow format:', flowDefinitions.length, 'with', promptTemplates.length, 'templates');
            console.log('🔍 FlowGraphEditor: Flow definitions:', flowDefinitions.map(f => ({
                id: f.id,
                name: f.name,
                steps: f.steps?.length || 0
            })));

            const flowNodes = [];
            const flowEdges = [];
            let yOffset = 0;

            flowDefinitions.forEach((flow, flowIndex) => {
                const flowY = yOffset;
                const flowHeight = 80;
                const stepSpacing = 280;  // Increased from 180

                // Add flow title node
                flowNodes.push({
                    id: `flow-${flow.id}`,
                    type: 'start',
                    position: {x: -200, y: flowY + 10},
                    data: {
                        title: flow.name,
                        entry_intents: flow.entry_intents || [],
                        flow_id: flow.id
                    },
                    draggable: editable
                });

                // Add step nodes
                if (flow.steps && flow.steps.length > 0) {
                    flow.steps.forEach((step, stepIndex) => {
                        const stepX = stepIndex * stepSpacing;
                        const stepY = flowY + 10;

                        // Determine node type based on step properties
                        let nodeType = 'response'; // default
                        if (step.id === 'start' || step.type === 'start') nodeType = 'start';
                        else if (step.intent_name) nodeType = 'intent';
                        else if (step.conditions && step.conditions.length > 0) nodeType = 'condition';
                        else if (step.memory_operation) nodeType = 'memory';
                        else if (step.knowledge_source) nodeType = 'knowledge';
                        else if (step.type === 'end' || step.id.includes('end')) nodeType = 'end';

                        // Check if this step is currently active
                        const isActive = activeFlow &&
                            activeFlow.flow_id === flow.id &&
                            activeFlow.current_step === step.id;

                        // Find prompt template for this step/intent
                        let stepIntent = step.intent_name || step.id;

                        // Smart mapping: step ID -> intent name
                        const stepToIntentMap = {
                            'initial_greeting': 'greeting',
                            'company_introduction': 'ask_about_npc_firm',
                            'conversation_opener': 'user_firm_info',
                            'company_overview': 'ask_about_npc_firm',
                            'services_presentation': 'ask_about_npc_firm',
                            'value_proposition': 'solution_presentation',
                            'examples_cases': 'solution_presentation',
                            'user_background': 'user_firm_info',
                            'business_challenges': 'user_needs',
                            'goals_expectations': 'user_expectations',
                            'deep_questions': 'user_questions',
                            'solution_overview': 'solution_presentation',
                            'detailed_proposal': 'solution_presentation',
                            'implementation_plan': 'solution_presentation',
                            'acknowledge_redirect': 'conversation_redirect',
                            'contact_collection': 'meeting_arrangement',
                            'next_steps': 'conversation_redirect',
                            // Additional mappings for remaining steps
                            'basic_company_info': 'user_firm_info',
                            'business_model': 'user_firm_info',
                            'target_market': 'user_firm_info',
                            'current_challenges': 'user_needs',
                            'pain_points': 'user_needs',
                            'impact_assessment': 'user_needs',
                            'solution_attempts': 'user_needs',
                            'success_metrics': 'user_expectations',
                            'cooperation_style': 'user_expectations',
                            'timeline_expectations': 'user_expectations',
                            'communication_preferences': 'user_expectations',
                            'success_criteria': 'user_expectations',
                            'context_clarification': 'user_questions',
                            'next_steps_proposal': 'conversation_redirect',
                            // Additional business flow steps
                            'deep_dive': 'user_questions',
                            'implications': 'user_expectations',
                            'action_items': 'conversation_redirect',
                            // Training flows mapping (for trainer avatar)
                            'concept_introduction': 'explain_concept',
                            'detailed_explanation': 'explain_concept',
                            'key_principles': 'theory_request',
                            'theory_summary': 'summarize',
                            'practice_design': 'show_me_how',
                            'task_assignment': 'practice_together',
                            'guidance_provision': 'guide_me',
                            'question_identification': 'ask_question',
                            'understanding_check': 'check_understanding',
                            'clarification_request': 'clarify',
                            'exercise_creation': 'exercise',
                            'solo_practice_setup': 'practice_alone',
                            'self_attempt_support': 'try_myself',
                            'knowledge_testing': 'test_me',
                            'knowledge_verification': 'check_knowledge',
                            'competency_assessment': 'assessment',
                            'content_summarization': 'summarize',
                            'learning_reflection': 'reflect',
                            'achievement_review': 'what_learned',
                            'progression_planning': 'what_next',
                            'learning_continuation': 'continue_learning',
                            'topic_transition': 'next_topic',
                            // Additional training steps mapping
                            'next_steps_planning': 'what_next',
                            'progress_assessment': 'assessment',
                            'gap_analysis': 'check_knowledge',
                            'path_recommendation': 'next_topic',
                            'resource_recommendation': 'next_topic',
                            'answer_formulation': 'ask_question',
                            'assessment_preparation': 'assessment',
                            'comprehension_check': 'check_understanding',
                            'content_recap': 'summarize',
                            'feedback_delivery': 'assessment',
                            'feedback_loop': 'check_understanding',
                            'key_insights': 'reflect',
                            'knowledge_retrieval': 'what_is',
                            'practice_completion': 'practice_alone',
                            'practice_setup': 'practice_together',
                            'progress_monitoring': 'assessment',
                            'question_identification': 'ask_question',
                            'reflection_questions': 'reflect',
                            'resource_provision': 'continue_learning',
                            'result_analysis': 'assessment',
                            'result_evaluation': 'check_knowledge',
                            'step_by_step_guidance': 'guide_me',
                            // Custom Avatar flows mapping (Prezes AI Tech)
                            'strategic_greeting': 'greeting',
                            'vision_sharing': 'solution_presentation',
                            'leadership_guidance': 'user_expectations',
                            'business_networking': 'conversation_redirect'
                        };

                        // Use mapped intent if available
                        if (stepToIntentMap[step.id]) {
                            stepIntent = stepToIntentMap[step.id];
                            console.log(`🔄 Mapped step ${step.id} → intent ${stepIntent}`);
                        }

                        const promptTemplate = promptTemplates.find(t => t.intent === stepIntent);
                        const intentDefinition = intentDefinitions.find(i => i.name === stepIntent);

                        // Debug template matching for ALL steps
                        const hasTemplate = !!promptTemplate;
                        const hasIntent = !!intentDefinition;
                        console.log(`🔍 Step ${step.id} (${stepIntent}): Template=${hasTemplate ? '✅' : '❌'} Intent=${hasIntent ? '✅' : '❌'}`);

                        if (!hasTemplate) {
                            console.log(`  ❌ Missing template for "${stepIntent}". Available:`, promptTemplates.map(t => t.intent).slice(0, 5));
                        }
                        if (!hasIntent) {
                            console.log(`  ❌ Missing intent for "${stepIntent}". Available:`, intentDefinitions.map(i => i.name).slice(0, 5));
                            console.log(`  🔍 Total intentDefinitions loaded:`, intentDefinitions.length);
                            console.log(`  🔍 All available intents:`, intentDefinitions.map(i => i.name));
                        }

                        flowNodes.push({
                            id: `${flow.id}-${step.id}`,
                            type: nodeType,
                            position: {x: stepX, y: stepY},
                            data: {
                                // Step properties
                                title: step.title || step.name || step.id,
                                description: step.description || '',
                                required: step.required || false,
                                next_steps: step.next_steps || [],
                                // Intent properties
                                intent_name: stepIntent,
                                intent_description: intentDefinition?.description || '',
                                intent_keywords: intentDefinition?.keywords || [],
                                intent_examples: intentDefinition?.examples || [],
                                // Prompt properties (from template or step)
                                system_prompt: promptTemplate?.system_prompt || step.system_prompt || '',
                                user_prompt_template: promptTemplate?.user_prompt_template || step.user_prompt_template || '',
                                prompt_variables: promptTemplate?.variables || [],
                                // Condition properties
                                conditions: step.conditions || [],
                                // Memory properties
                                memory_operation: step.memory_operation || '',
                                memory_key: step.memory_key || '',
                                // Knowledge properties
                                knowledge_source: step.knowledge_source || '',
                                vector_search: step.vector_search || false,
                                // Meta
                                step_id: step.id,
                                flow_id: flow.id,
                                active: isActive,
                                // Template info
                                has_prompt_template: !!promptTemplate,
                                has_intent_definition: !!intentDefinition
                            },
                            className: isActive ? 'active-step' : '',
                            draggable: editable
                        });

                        // Add edges based on next_steps (primary method)
                        if (step.next_steps && step.next_steps.length > 0) {
                            console.log(`🔗 Step ${step.id} has next_steps:`, step.next_steps);
                            step.next_steps.forEach(nextStepId => {
                                // Handle "completed" as end node
                                if (nextStepId === 'completed') {
                                    console.log(`⏭️ Skipping 'completed' for step ${step.id}`);
                                    return;
                                }

                                const targetStepExists = flow.steps.find(s => s.id === nextStepId);
                                if (targetStepExists) {
                                    const isActiveEdge = isActive &&
                                        activeFlow?.current_step === step.id;

                                    const edge = {
                                        id: `edge-${flow.id}-${step.id}-${nextStepId}`,
                                        source: `${flow.id}-${step.id}`,
                                        target: `${flow.id}-${nextStepId}`,
                                        type: 'smoothstep',
                                        markerEnd: {
                                            type: ArrowClosed,
                                        },
                                        style: {
                                            stroke: isActiveEdge ? '#22c55e' : '#ffffff',
                                            strokeWidth: isActiveEdge ? 4 : 3
                                        },
                                        animated: isActiveEdge
                                    };

                                    console.log(`✅ Adding edge: ${step.id} -> ${nextStepId}`, {
                                        id: edge.id,
                                        source: edge.source,
                                        target: edge.target,
                                        markerType: ArrowClosed,
                                        strokeColor: edge.style.stroke,
                                        strokeWidth: edge.style.strokeWidth
                                    });
                                    flowEdges.push(edge);
                                } else {
                                    console.log(`❌ Target step '${nextStepId}' not found for step '${step.id}'`);
                                }
                            });
                        } else if (stepIndex < flow.steps.length - 1) {
                            // Fallback: consecutive steps if no next_steps defined
                            const isActiveEdge = isActive &&
                                activeFlow?.current_step === step.id;

                            const edge = {
                                id: `edge-${flow.id}-${step.id}-${flow.steps[stepIndex + 1].id}`,
                                source: `${flow.id}-${step.id}`,
                                target: `${flow.id}-${flow.steps[stepIndex + 1].id}`,
                                type: 'smoothstep',
                                markerEnd: {
                                    type: ArrowClosed,
                                },
                                style: {
                                    stroke: isActiveEdge ? '#22c55e' : '#ffffff',
                                    strokeWidth: isActiveEdge ? 4 : 3
                                },
                                animated: isActiveEdge
                            };

                            console.log(`🔄 Fallback edge: ${step.id} -> ${flow.steps[stepIndex + 1].id}`, {
                                id: edge.id,
                                source: edge.source,
                                target: edge.target,
                                markerType: ArrowClosed,
                                strokeColor: edge.style.stroke,
                                strokeWidth: edge.style.strokeWidth
                            });
                            flowEdges.push(edge);
                        } else {
                            console.log(`⚠️ Step ${step.id} has no next_steps and is last step`);
                        }
                    });
                }

                yOffset += Math.max(150, flowHeight + 80);  // Increased spacing between flows
            });

            console.log('🎯 FlowGraphEditor: Created nodes:', flowNodes.length, 'edges:', flowEdges.length);
            console.log('🎯 FlowGraphEditor: Sample nodes:', flowNodes.slice(0, 2));
            console.log('🎯 FlowGraphEditor: Sample edges:', flowEdges.slice(0, 2));
            console.log('🎯 FlowGraphEditor: Edge details:', flowEdges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                type: e.type,
                hasMarker: !!e.markerEnd
            })).slice(0, 5));
            setNodes(flowNodes);
            setEdges(flowEdges);
        }, [flowDefinitions, activeFlow, editable, promptTemplates?.length, intentDefinitions?.length]);

        // Handle node click
        const handleNodeClick = React.useCallback((event, node) => {
            console.log('🎯 FlowGraphEditor: Node clicked:', node);
            setSelectedNode(node);

            // If editable, open edit dialog
            if (editable) {
                setEditingNode({
                    id: node.id,
                    type: node.type,
                    // Flow Step Properties
                    title: node.data.title,
                    description: node.data.description || '',
                    required: node.data.required || false,
                    next_steps: node.data.next_steps || [],
                    // Intent Properties
                    intent_name: node.data.intent_name || '',
                    // Prompt Properties  
                    system_prompt: node.data.system_prompt || '',
                    user_prompt_template: node.data.user_prompt_template || '',
                    // Condition Properties
                    conditions: node.data.conditions || [],
                    // Memory Properties
                    memory_operation: node.data.memory_operation || '',
                    memory_key: node.data.memory_key || '',
                    // Knowledge Properties
                    knowledge_source: node.data.knowledge_source || '',
                    vector_search: node.data.vector_search || false,
                    // Meta
                    flow_id: node.data.flow_id,
                    step_id: node.data.step_id,
                    active: node.data.active || false
                });
                setShowNodeDialog(true);
            }

            onNodeClick(node);
        }, [onNodeClick, editable]);

        // Handle edge connection (for editable mode)
        const onConnect = React.useCallback((params) => {
            if (!editable) return;
            console.log('🎯 FlowGraphEditor: Connecting nodes:', params);
            setEdges((eds) => addEdge(params, eds));
        }, [editable, setEdges]);

        if (!ReactFlow) {
            return React.createElement('div', {
                style: {
                    padding: '20px',
                    textAlign: 'center',
                    color: '#ef4444'
                }
            }, 'ReactFlow library not loaded. Please check CDN import.');
        }

        console.log('🎯 FlowGraphEditor: About to render ReactFlow with:', {
            nodes: nodes.length,
            edges: edges.length,
            ReactFlowAvailable: !!ReactFlow,
            MarkerTypeAvailable: !!MarkerType,
            ArrowClosedValue: ArrowClosed
        });

        // Debug DOM after render - DETAILED
        setTimeout(() => {
            const edgeElements = document.querySelectorAll('.react-flow__edge-path');
            const svgPaths = document.querySelectorAll('.react-flow__edges path');
            const allSvgPaths = document.querySelectorAll('svg path');

            console.log('🔍 DOM Debug: Edge elements (.react-flow__edge-path):', edgeElements.length);
            console.log('🔍 DOM Debug: ReactFlow SVG paths (.react-flow__edges path):', svgPaths.length);
            console.log('🔍 DOM Debug: All SVG paths (svg path):', allSvgPaths.length);

            if (svgPaths.length > 0) {
                console.log('🔍 DOM Debug: First ReactFlow path:', svgPaths[0]);
                console.log('🔍 DOM Debug: First path style:', window.getComputedStyle(svgPaths[0]));
            }

            // Check ReactFlow edges container
            const edgesContainer = document.querySelector('.react-flow__edges');
            if (edgesContainer) {
                console.log('🔍 DOM Debug: ReactFlow edges container found:', edgesContainer);
                console.log('🔍 DOM Debug: Edges container children:', edgesContainer.children.length);
            }

            // Debug black overlays
            const blackRects = document.querySelectorAll('rect[fill="#000000"], rect[fill="black"]');
            const selectionPanes = document.querySelectorAll('.react-flow__selectionpane, .react-flow__pane');
            console.log('🔍 DOM Debug: Black rectangles found:', blackRects.length);
            console.log('🔍 DOM Debug: Selection panes found:', selectionPanes.length);

            if (blackRects.length > 0) {
                console.log('🔍 DOM Debug: First black rect:', blackRects[0]);
                blackRects[0].style.display = 'none'; // Force hide
            }
        }, 1000);

        return React.createElement('div', {
            style: {
                width: '100%',
                height: '600px',
                border: '1px solid #374151',
                borderRadius: '8px',
                backgroundColor: '#0d1117'
            }
        }, [
            // Debug edges before ReactFlow render
            console.log('🔥 FINAL DEBUG: Passing to ReactFlow:', {
                nodeCount: nodes.length,
                edgeCount: edges.length,
                firstEdge: edges[0],
                edgeIds: edges.map(e => e.id).slice(0, 3)
            }),
            React.createElement(ReactFlow, {
                key: 'reactflow',
                nodes: nodes,
                edges: edges,
                onNodesChange: editable ? onNodesChange : undefined,
                onEdgesChange: editable ? onEdgesChange : undefined,
                onConnect: editable ? onConnect : undefined,
                onNodeClick: handleNodeClick,
                nodeTypes: nodeTypes,
                fitView: true,
                fitViewOptions: {padding: 0.1},
                defaultViewport: {x: 0, y: 0, zoom: 0.8},
                minZoom: 0.2,
                maxZoom: 2,
                nodesDraggable: editable,
                nodesConnectable: editable,
                elementsSelectable: true,
                connectionLineType: 'smoothstep',
                edgesUpdatable: false,
                deleteKeyCode: null  // Disable delete key
            }, [
                React.createElement(Controls, {key: 'controls'}),
                // Background removed - may cause black overlay
                // React.createElement(Background, { 
                //     key: 'background',
                //     color: '#374151',
                //     gap: 16
                // }),
                // Clean approach: Simple CSS-only solution
                React.createElement('style', {
                    key: 'force-edge-styles',
                    dangerouslySetInnerHTML: {
                        __html: `
                            /* Force ReactFlow edges to be visible */
                            .react-flow__edges path,
                            .react-flow__edge path {
                                stroke: #ffffff !important;
                                stroke-width: 2px !important;
                                opacity: 1 !important;
                                fill: none !important;
                                display: block !important;
                                visibility: visible !important;
                            }
                        `
                    }
                })
            ]),

            // Node Edit Dialog
            showNodeDialog && React.createElement('div', {
                key: 'dialog-overlay',
                style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                },
                onClick: () => setShowNodeDialog(false)
            }, [
                React.createElement('div', {
                    key: 'dialog',
                    style: {
                        backgroundColor: '#1f2937',
                        borderRadius: '8px',
                        padding: '24px',
                        minWidth: '400px',
                        maxWidth: '600px',
                        color: 'white',
                        border: '1px solid #374151'
                    },
                    onClick: (e) => e.stopPropagation()
                }, [
                    React.createElement('h3', {
                        key: 'title',
                        style: {marginBottom: '16px', color: '#f9fafb'}
                    }, `Edit ${editingNode?.type || 'Node'}: ${editingNode?.title || 'Untitled'}`),

                    React.createElement('div', {
                        key: 'content',
                        style: {marginBottom: '16px', maxHeight: '400px', overflowY: 'auto'}
                    }, [
                        // === FLOW STEP PROPERTIES ===
                        React.createElement('h4', {
                            key: 'step-header',
                            style: {
                                color: '#3b82f6',
                                marginBottom: '12px',
                                fontSize: '16px',
                                borderBottom: '1px solid #374151',
                                paddingBottom: '4px'
                            }
                        }, '📋 Flow Step Properties'),

                        React.createElement('label', {
                            key: 'title-label',
                            style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                        }, 'Step Title:'),
                        React.createElement('input', {
                            key: 'title-input',
                            type: 'text',
                            value: editingNode?.title || '',
                            onChange: (e) => setEditingNode(prev => ({...prev, title: e.target.value})),
                            style: {
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #4b5563',
                                backgroundColor: '#374151',
                                color: 'white',
                                marginBottom: '12px'
                            }
                        }),

                        React.createElement('label', {
                            key: 'description-label',
                            style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                        }, 'Step Description:'),
                        React.createElement('textarea', {
                            key: 'description-input',
                            value: editingNode?.description || '',
                            onChange: (e) => setEditingNode(prev => ({...prev, description: e.target.value})),
                            rows: 2,
                            style: {
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #4b5563',
                                backgroundColor: '#374151',
                                color: 'white',
                                marginBottom: '12px',
                                resize: 'vertical'
                            }
                        }),

                        React.createElement('div', {
                            key: 'required-section',
                            style: {marginBottom: '12px'}
                        }, [
                            React.createElement('label', {
                                key: 'required-checkbox',
                                style: {display: 'flex', alignItems: 'center', color: '#d1d5db', cursor: 'pointer'}
                            }, [
                                React.createElement('input', {
                                    key: 'required-input',
                                    type: 'checkbox',
                                    checked: editingNode?.required || false,
                                    onChange: (e) => setEditingNode(prev => ({...prev, required: e.target.checked})),
                                    style: {marginRight: '8px'}
                                }),
                                'Required Step'
                            ])
                        ]),

                        React.createElement('label', {
                            key: 'next-steps-label',
                            style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                        }, 'Next Steps (comma-separated):'),
                        React.createElement('input', {
                            key: 'next-steps-input',
                            type: 'text',
                            value: (editingNode?.next_steps || []).join(', '),
                            onChange: (e) => setEditingNode(prev => ({
                                ...prev,
                                next_steps: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            })),
                            placeholder: 'e.g. step2, step3, completed',
                            style: {
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #4b5563',
                                backgroundColor: '#374151',
                                color: 'white',
                                marginBottom: '16px'
                            }
                        }),

                        // === INTENT PROPERTIES ===
                        editingNode?.intent_name && React.createElement('div', {
                            key: 'intent-section'
                        }, [
                            React.createElement('h4', {
                                key: 'intent-header',
                                style: {
                                    color: '#f59e0b',
                                    marginBottom: '12px',
                                    fontSize: '16px',
                                    borderBottom: '1px solid #374151',
                                    paddingBottom: '4px'
                                }
                            }, `🎯 Intent Properties ${editingNode?.has_intent_definition ? '✅' : '⚠️'}`),

                            React.createElement('label', {
                                key: 'intent-label',
                                style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                            }, 'Intent Name:'),
                            React.createElement('input', {
                                key: 'intent-input',
                                type: 'text',
                                value: editingNode?.intent_name || '',
                                onChange: (e) => setEditingNode(prev => ({...prev, intent_name: e.target.value})),
                                style: {
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #4b5563',
                                    backgroundColor: '#374151',
                                    color: 'white',
                                    marginBottom: '12px'
                                }
                            }),

                            editingNode?.intent_description && React.createElement('div', {
                                key: 'intent-description'
                            }, [
                                React.createElement('label', {
                                    key: 'desc-label',
                                    style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                                }, 'Intent Description:'),
                                React.createElement('div', {
                                    key: 'desc-value',
                                    style: {
                                        padding: '8px',
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #4b5563',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        color: '#d1d5db',
                                        marginBottom: '12px'
                                    }
                                }, editingNode.intent_description)
                            ]),

                            editingNode?.intent_keywords?.length > 0 && React.createElement('div', {
                                key: 'intent-keywords'
                            }, [
                                React.createElement('label', {
                                    key: 'keywords-label',
                                    style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                                }, 'Keywords:'),
                                React.createElement('div', {
                                    key: 'keywords-value',
                                    style: {
                                        padding: '8px',
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #4b5563',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        color: '#d1d5db',
                                        marginBottom: '12px'
                                    }
                                }, editingNode.intent_keywords.join(', '))
                            ]),

                            editingNode?.intent_examples?.length > 0 && React.createElement('div', {
                                key: 'intent-examples'
                            }, [
                                React.createElement('label', {
                                    key: 'examples-label',
                                    style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                                }, 'Examples:'),
                                React.createElement('div', {
                                    key: 'examples-value',
                                    style: {
                                        padding: '8px',
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #4b5563',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        color: '#d1d5db',
                                        marginBottom: '16px',
                                        maxHeight: '100px',
                                        overflowY: 'auto'
                                    }
                                }, editingNode.intent_examples.map((example, i) => `${i + 1}. ${example}`).join('\n'))
                            ])
                        ]),

                        // === PROMPT PROPERTIES ===
                        React.createElement('div', {
                            key: 'prompt-section'
                        }, [
                            React.createElement('h4', {
                                key: 'prompt-header',
                                style: {
                                    color: '#8b5cf6',
                                    marginBottom: '12px',
                                    fontSize: '16px',
                                    borderBottom: '1px solid #374151',
                                    paddingBottom: '4px'
                                }
                            }, `💬 Prompt Templates ${editingNode?.has_prompt_template ? '✅' : '⚠️'}`),

                            React.createElement('label', {
                                key: 'system-prompt-label',
                                style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                            }, 'System Prompt:'),
                            React.createElement('textarea', {
                                key: 'system-prompt-input',
                                value: editingNode?.system_prompt || '',
                                onChange: (e) => setEditingNode(prev => ({...prev, system_prompt: e.target.value})),
                                rows: 3,
                                placeholder: 'Enter system prompt for this step...',
                                style: {
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #4b5563',
                                    backgroundColor: '#374151',
                                    color: 'white',
                                    marginBottom: '12px',
                                    resize: 'vertical'
                                }
                            }),

                            React.createElement('label', {
                                key: 'user-prompt-label',
                                style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                            }, 'User Prompt Template:'),
                            React.createElement('textarea', {
                                key: 'user-prompt-input',
                                value: editingNode?.user_prompt_template || '',
                                onChange: (e) => setEditingNode(prev => ({
                                    ...prev,
                                    user_prompt_template: e.target.value
                                })),
                                rows: 3,
                                placeholder: 'Enter user prompt template...',
                                style: {
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #4b5563',
                                    backgroundColor: '#374151',
                                    color: 'white',
                                    marginBottom: '16px',
                                    resize: 'vertical'
                                }
                            })
                        ]),

                        // === MEMORY PROPERTIES ===
                        editingNode?.type === 'memory' && React.createElement('div', {
                            key: 'memory-section'
                        }, [
                            React.createElement('h4', {
                                key: 'memory-header',
                                style: {
                                    color: '#ec4899',
                                    marginBottom: '12px',
                                    fontSize: '16px',
                                    borderBottom: '1px solid #374151',
                                    paddingBottom: '4px'
                                }
                            }, '🧠 Memory Operations'),

                            React.createElement('label', {
                                key: 'memory-op-label',
                                style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                            }, 'Memory Operation:'),
                            React.createElement('input', {
                                key: 'memory-op-input',
                                type: 'text',
                                value: editingNode?.memory_operation || '',
                                onChange: (e) => setEditingNode(prev => ({...prev, memory_operation: e.target.value})),
                                placeholder: 'e.g. store, retrieve, update',
                                style: {
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #4b5563',
                                    backgroundColor: '#374151',
                                    color: 'white',
                                    marginBottom: '12px'
                                }
                            }),

                            React.createElement('label', {
                                key: 'memory-key-label',
                                style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                            }, 'Memory Key:'),
                            React.createElement('input', {
                                key: 'memory-key-input',
                                type: 'text',
                                value: editingNode?.memory_key || '',
                                onChange: (e) => setEditingNode(prev => ({...prev, memory_key: e.target.value})),
                                placeholder: 'e.g. user_context, conversation_state',
                                style: {
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #4b5563',
                                    backgroundColor: '#374151',
                                    color: 'white',
                                    marginBottom: '16px'
                                }
                            })
                        ]),

                        // === KNOWLEDGE PROPERTIES ===
                        editingNode?.type === 'knowledge' && React.createElement('div', {
                            key: 'knowledge-section'
                        }, [
                            React.createElement('h4', {
                                key: 'knowledge-header',
                                style: {
                                    color: '#eab308',
                                    marginBottom: '12px',
                                    fontSize: '16px',
                                    borderBottom: '1px solid #374151',
                                    paddingBottom: '4px'
                                }
                            }, '📚 Knowledge & RAG'),

                            React.createElement('label', {
                                key: 'knowledge-source-label',
                                style: {display: 'block', marginBottom: '4px', fontSize: '14px', color: '#d1d5db'}
                            }, 'Knowledge Source:'),
                            React.createElement('input', {
                                key: 'knowledge-source-input',
                                type: 'text',
                                value: editingNode?.knowledge_source || '',
                                onChange: (e) => setEditingNode(prev => ({...prev, knowledge_source: e.target.value})),
                                placeholder: 'e.g. business_docs, product_catalog',
                                style: {
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #4b5563',
                                    backgroundColor: '#374151',
                                    color: 'white',
                                    marginBottom: '12px'
                                }
                            }),

                            React.createElement('div', {
                                key: 'vector-search-section',
                                style: {marginBottom: '16px'}
                            }, [
                                React.createElement('label', {
                                    key: 'vector-search-checkbox',
                                    style: {display: 'flex', alignItems: 'center', color: '#d1d5db', cursor: 'pointer'}
                                }, [
                                    React.createElement('input', {
                                        key: 'vector-search-input',
                                        type: 'checkbox',
                                        checked: editingNode?.vector_search || false,
                                        onChange: (e) => setEditingNode(prev => ({
                                            ...prev,
                                            vector_search: e.target.checked
                                        })),
                                        style: {marginRight: '8px'}
                                    }),
                                    'Enable Vector Search'
                                ])
                            ])
                        ])
                    ]),

                    React.createElement('div', {
                        key: 'buttons',
                        style: {display: 'flex', gap: '8px', justifyContent: 'flex-end'}
                    }, [
                        React.createElement('button', {
                            key: 'cancel',
                            onClick: () => {
                                setShowNodeDialog(false);
                                setEditingNode(null);
                            },
                            style: {
                                padding: '8px 16px',
                                borderRadius: '4px',
                                border: '1px solid #6b7280',
                                backgroundColor: 'transparent',
                                color: '#d1d5db',
                                cursor: 'pointer'
                            }
                        }, 'Cancel'),
                        React.createElement('button', {
                            key: 'save',
                            onClick: () => {
                                console.log('🎯 Saving node:', editingNode);
                                // TODO: Save to backend API
                                setShowNodeDialog(false);
                                setEditingNode(null);
                            },
                            style: {
                                padding: '8px 16px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                cursor: 'pointer'
                            }
                        }, 'Save Changes')
                    ])
                ])
            ])
        ]);
    };

    return FlowGraphEditor;
})();

// Export for use in other components
window.FlowGraphEditor = FlowGraphEditor;
