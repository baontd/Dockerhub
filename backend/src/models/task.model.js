const { v4: uuidv4 } = require('uuid');

/**
 * Task Model - Layer 5
 * Represents the structure and business logic for a task
 */
class Task {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.text = data.text || '';
        this.completed = data.completed || false;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Validate task data
     * @returns {Object} validation result
     */
    validate() {
        const errors = [];

        if (!this.text || typeof this.text !== 'string') {
            errors.push('Text is required and must be a string');
        }

        if (this.text.length > 100) {
            errors.push('Text must not exceed 100 characters');
        }

        if (this.text.trim().length === 0) {
            errors.push('Text cannot be empty');
        }

        if (typeof this.completed !== 'boolean') {
            errors.push('Completed must be a boolean value');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Update task properties
     * @param {Object} updates - Properties to update
     */
    update(updates) {
        const allowedFields = ['text', 'completed'];
        
        for (const field of allowedFields) {
            if (updates.hasOwnProperty(field)) {
                this[field] = updates[field];
            }
        }
        
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Mark task as completed
     */
    markCompleted() {
        this.completed = true;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Mark task as not completed
     */
    markIncomplete() {
        this.completed = false;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Convert task to plain object for serialization
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            text: this.text,
            completed: this.completed,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create Task instance from plain object
     * @param {Object} data - Plain object data
     * @returns {Task} Task instance
     */
    static fromJSON(data) {
        return new Task(data);
    }

    /**
     * Create multiple Task instances from array
     * @param {Array} dataArray - Array of plain objects
     * @returns {Array} Array of Task instances
     */
    static fromJSONArray(dataArray) {
        return dataArray.map(data => Task.fromJSON(data));
    }
}

module.exports = Task;
