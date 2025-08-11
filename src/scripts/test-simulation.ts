#!/usr/bin/env ts-node

/**
 * Test script for Conversation Simulation Module
 * Demonstrates the simulation functionality and analysis capabilities
 */

import path from 'path';
import fs from 'fs';
import {
    SimulationScenario,
    SimulationConfig,
    SimulationParticipant,
    BusinessAvatar
} from '../models/types';
import SimulationManager from '../services/simulation-manager.service';
import { ConversationAnalyzerService } from '../services/conversation-analyzer.service';

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function loadTestData() {
    console.log('📁 Loading test data...');
    
    // Load scenarios
    const scenariosPath = path.resolve(__dirname, '../config/simulation-scenarios.json');
    const avatarsPath = path.resolve(__dirname, '../config/simulation-avatars.json');
    
    const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
    const avatarsData = JSON.parse(fs.readFileSync(avatarsPath, 'utf8'));
    
    return {
        scenarios: scenariosData.scenarios,
        avatars: avatarsData.simulation_avatars
    };
}

function createTestAvatar(avatarData: any): BusinessAvatar {
    return {
        _id: avatarData._id,
        firstName: avatarData.firstName,
        lastName: avatarData.lastName,
        company: avatarData.company,
        personality: avatarData.personality,
        position: avatarData.position,
        experience_years: avatarData.experience_years,
        specializations: avatarData.specializations,
        active_flows: avatarData.active_flows || []
    };
}

function createTestScenario(scenarioTemplate: any, avatars: any): SimulationScenario {
    // Create participants with full avatar data
    const participants: SimulationParticipant[] = scenarioTemplate.participants.map((p: any) => {
        const avatarData = avatars[p.avatarType];
        if (!avatarData) {
            throw new Error(`Avatar type ${p.avatarType} not found`);
        }

        return {
            id: p.id,
            avatarType: p.avatarType,
            role: p.role,
            avatar: createTestAvatar(avatarData),
            persona: p.persona,
            responseStyle: p.responseStyle
        };
    });

    return {
        id: scenarioTemplate.id,
        name: scenarioTemplate.name,
        description: scenarioTemplate.description,
        objective: scenarioTemplate.objective,
        duration_minutes: scenarioTemplate.duration_minutes,
        context: scenarioTemplate.context,
        participants,
        conversation_starters: scenarioTemplate.conversation_starters,
        evaluation_criteria: scenarioTemplate.evaluation_criteria
    };
}

async function runSimulationTest() {
    console.log('🧪 Starting Conversation Simulation Test');
    console.log('========================================\n');

    try {
        // Load test data
        const { scenarios, avatars } = await loadTestData();
        console.log(`✅ Loaded ${scenarios.length} scenarios and ${Object.keys(avatars).length} avatar types\n`);

        // Get simulation manager
        const simulationManager = SimulationManager.getInstance();

        // Test scenario: B2B IT Sales
        const testScenarioTemplate = scenarios.find((s: any) => s.id === 'b2b_it_sales');
        if (!testScenarioTemplate) {
            throw new Error('Test scenario not found');
        }

        const testScenario = createTestScenario(testScenarioTemplate, avatars);
        console.log(`🎯 Using scenario: ${testScenario.name}`);
        console.log(`   Objective: ${testScenario.objective}`);
        console.log(`   Duration: ${testScenario.duration_minutes} minutes`);
        console.log(`   Participants: ${testScenario.participants.length}\n`);

        // Show participants
        testScenario.participants.forEach((participant, index) => {
            console.log(`   ${index + 1}. ${participant.persona.name} (${participant.role})`);
            console.log(`      Avatar: ${participant.avatarType}`);
            console.log(`      Background: ${participant.persona.background}`);
            console.log(`      Style: ${participant.responseStyle}\n`);
        });

        // Configuration
        const config: SimulationConfig = {
            auto_start: true,
            turn_timeout_seconds: 30,
            max_message_length: 800,
            enable_real_time_analysis: true,
            save_to_database: false, // Don't save to DB in test
            export_format: 'json',
            analysis_depth: 'detailed'
        };

        console.log('⚙️ Configuration:');
        console.log(`   Auto-start: ${config.auto_start}`);
        console.log(`   Turn timeout: ${config.turn_timeout_seconds}s`);
        console.log(`   Max message length: ${config.max_message_length} chars`);
        console.log(`   Real-time analysis: ${config.enable_real_time_analysis}\n`);

        // Check if OpenAI API key is available
        if (!process.env.OPENAI_API_KEY) {
            console.log('⚠️  WARNING: OPENAI_API_KEY not found. Simulation will run with mock responses.\n');
        }

        console.log('🚀 Starting simulation...\n');

        // Start simulation
        const simulation = await simulationManager.startSimulation(testScenario, config);
        
        console.log(`✅ Simulation created with ID: ${simulation.id}`);
        console.log(`   Status: ${simulation.status}`);
        console.log(`   Max turns: ${simulation.max_turns}\n`);

        // Monitor simulation progress
        let lastMessageCount = 0;
        const monitorInterval = setInterval(() => {
            const currentSim = simulationManager.getSimulation(simulation.id);
            if (currentSim) {
                if (currentSim.messages.length > lastMessageCount) {
                    const newMessages = currentSim.messages.slice(lastMessageCount);
                    newMessages.forEach(msg => {
                        const participant = currentSim.scenario.participants.find(p => p.id === msg.participant_id);
                        const name = participant?.persona.name || 'Unknown';
                        console.log(`💬 ${name}: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`);
                        console.log(`   Intent: ${msg.intent} | Response time: ${msg.response_time_ms}ms\n`);
                    });
                    lastMessageCount = currentSim.messages.length;
                }

                if (currentSim.status === 'completed' || currentSim.status === 'failed') {
                    clearInterval(monitorInterval);
                    handleSimulationComplete(currentSim);
                }
            }
        }, 2000);

        // Set timeout for the test
        setTimeout(() => {
            clearInterval(monitorInterval);
            const finalSim = simulationManager.getSimulation(simulation.id);
            if (finalSim && finalSim.status === 'running') {
                console.log('⏰ Test timeout reached, analyzing current state...\n');
                handleSimulationComplete(finalSim);
            }
        }, 60000); // 1 minute timeout

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

async function handleSimulationComplete(simulation: any) {
    console.log('📊 Simulation completed, generating analysis...\n');
    
    // Display results
    console.log('=== SIMULATION RESULTS ===');
    console.log(`Status: ${simulation.status}`);
    console.log(`Total messages: ${simulation.messages.length}`);
    console.log(`Duration: ${Math.round((Date.now() - simulation.start_time) / 1000)}s`);
    console.log(`Quality score: ${simulation.analysis.conversation_quality_score}%\n`);

    // Display conversation excerpt
    console.log('=== CONVERSATION EXCERPT ===');
    const lastMessages = simulation.messages.slice(-6); // Last 6 messages
    lastMessages.forEach((msg: any) => {
        const participant = simulation.scenario.participants.find((p: any) => p.id === msg.participant_id);
        const name = participant?.persona.name || 'Unknown';
        console.log(`${name}: "${msg.content}"`);
    });
    console.log();

    // Display analysis
    if (simulation.analysis) {
        console.log('=== ANALYSIS ===');
        
        // Conversation metrics
        console.log('Conversation Metrics:');
        console.log(`  Total turns: ${simulation.analysis.conversation_metrics.total_turns}`);
        console.log(`  Avg message length: ${Math.round(simulation.analysis.conversation_metrics.avg_message_length)} chars`);
        console.log(`  Topic consistency: ${Math.round(simulation.analysis.conversation_metrics.topic_consistency * 100)}%`);
        console.log(`  Goal achievement: ${Math.round(simulation.analysis.conversation_metrics.goal_achievement_rate * 100)}%\n`);

        // Response times
        console.log('Response Times:');
        console.log(`  Average: ${Math.round(simulation.analysis.response_times.average)}ms`);
        console.log(`  Min: ${simulation.analysis.response_times.min}ms`);
        console.log(`  Max: ${simulation.analysis.response_times.max}ms\n`);

        // Insights
        if (simulation.analysis.insights?.length > 0) {
            console.log('Insights:');
            simulation.analysis.insights.forEach((insight: string, index: number) => {
                console.log(`  ${index + 1}. ${insight}`);
            });
            console.log();
        }

        // Improvement suggestions
        if (simulation.analysis.improvement_suggestions?.length > 0) {
            console.log('Improvement Suggestions:');
            simulation.analysis.improvement_suggestions.forEach((suggestion: string, index: number) => {
                console.log(`  ${index + 1}. ${suggestion}`);
            });
            console.log();
        }
    }

    console.log('✅ Test completed successfully!');
    process.exit(0);
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Run the test
if (require.main === module) {
    runSimulationTest().catch(console.error);
}

export { runSimulationTest };
