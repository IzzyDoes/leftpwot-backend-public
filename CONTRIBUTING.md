# Contributing to LeftPlot

Thank you for your interest in contributing to LeftPlot! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### 1. Fork the Repository
- Fork the repository to your GitHub account
- Clone your fork locally: `git clone https://github.com/yourusername/leftplot-backend.git`

### 2. Set Up Development Environment
```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Set up database
createdb leftplot_db
psql -d leftplot_db -f db/schema.sql
psql -d leftplot_db -f megaseed.sql

# Start development server
npm run dev
```

### 3. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 4. Make Your Changes
- Write clean, well-documented code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 5. Test Your Changes
```bash
# Run all tests
npm test

# Run specific test files
npm test -- auth.test.js
```

### 6. Commit Your Changes
```bash
git add .
git commit -m "feat: add new feature description"
```

### 7. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```

## 📋 Pull Request Guidelines

### Before Submitting
- [ ] Code follows the project's style guidelines
- [ ] All tests pass
- [ ] New functionality has tests
- [ ] Documentation is updated
- [ ] No sensitive information is included

### Pull Request Template
```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security fix

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
```

## 🏗️ Development Guidelines

### Code Style
- Use meaningful variable and function names
- Add comments for complex logic
- Follow JavaScript/Node.js best practices
- Use ES6+ features where appropriate

### Database Changes
- Always include migration scripts
- Test database changes thoroughly
- Update schema documentation

### API Changes
- Follow RESTful conventions
- Include proper error handling
- Add input validation
- Update API documentation

### Security
- Never commit sensitive information
- Validate all user inputs
- Use parameterized queries
- Follow security best practices

## 🧪 Testing Guidelines

### Writing Tests
- Write tests for all new functionality
- Test both success and error cases
- Use descriptive test names
- Mock external dependencies

### Test Structure
```javascript
describe('Feature Name', () => {
  describe('when condition', () => {
    it('should do something', () => {
      // Test implementation
    });
  });
});
```

## 📚 Documentation

### Code Documentation
- Add JSDoc comments for functions
- Document complex algorithms
- Include usage examples

### API Documentation
- Update endpoint documentation
- Include request/response examples
- Document error codes

## 🐛 Bug Reports

### Before Reporting
- Check existing issues
- Try to reproduce the bug
- Gather relevant information

### Bug Report Template
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS, Windows, Linux]
- Node.js version: [e.g., 18.0.0]
- Database: [e.g., PostgreSQL 14]

## Additional Information
Screenshots, logs, etc.
```

## 💡 Feature Requests

### Before Requesting
- Check if the feature already exists
- Consider the impact on existing functionality
- Think about implementation complexity

### Feature Request Template
```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Implementation
How should this be implemented?

## Alternatives Considered
What other approaches were considered?

## Additional Information
Mockups, examples, etc.
```

## 🏷️ Commit Message Guidelines

### Format
```
type(scope): description

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tool changes

### Examples
```
feat(auth): add email verification
fix(posts): resolve slug generation issue
docs(api): update endpoint documentation
```

## 🚀 Release Process

### Versioning
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update version in package.json
- Create release notes

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version bumped
- [ ] Release notes written
- [ ] Tagged and pushed

## 📞 Getting Help

### Questions?
- Check existing documentation
- Search existing issues
- Ask in discussions

### Need Help?
- Create an issue with "help wanted" label
- Join community discussions
- Contact maintainers

## 🙏 Recognition

Contributors will be recognized in:
- Project README
- Release notes
- Contributor hall of fame

Thank you for contributing to LeftPlot! 🎉 