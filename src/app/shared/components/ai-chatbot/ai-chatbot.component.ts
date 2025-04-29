import { Component, OnInit } from '@angular/core';
import { AIService } from '../../../services/ai.service';

@Component({
  selector: 'app-ai-chatbot',
  templateUrl: './ai-chatbot.component.html',
  styleUrls: ['./ai-chatbot.component.css']
})
export class AiChatbotComponent implements OnInit {
  isChatOpen = false;
  messages: { text: string, fromUser: boolean, timestamp: Date }[] = [];
  newMessage = '';
  isLoading = false;
  
  constructor(private aiService: AIService) { }

  ngOnInit(): void {
    // Initial welcome message
    this.messages.push({
      text: 'Hello! I\'m your Eden Link AI assistant. I can help you with agricultural advice, crop management, and farm optimization. How can I assist you today?',
      fromUser: false,
      timestamp: new Date()
    });
  }
  
  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
  }
  
  sendMessage(): void {
    if (!this.newMessage.trim() || this.isLoading) return;
    
    // Add user message
    this.messages.push({
      text: this.newMessage,
      fromUser: true,
      timestamp: new Date()
    });
    
    // Store and clear message input
    const userQuery = this.newMessage;
    this.newMessage = '';
    this.isLoading = true;
    
    // Get AI response
    this.aiService.chat(userQuery).subscribe(
      (response) => {
        this.messages.push({
          text: response,
          fromUser: false,
          timestamp: new Date()
        });
        this.isLoading = false;
      },
      (error) => {
        console.error('Error getting AI response:', error);
        // Fallback response
        this.messages.push({
          text: 'I\'m having trouble connecting right now. Please try again later.',
          fromUser: false,
          timestamp: new Date()
        });
        this.isLoading = false;
      }
    );
  }
}