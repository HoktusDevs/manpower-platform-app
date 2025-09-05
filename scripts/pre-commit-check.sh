#!/bin/bash

# 🎯 Pre-Commit Quality Check
# Enforces CODING_STANDARDS.md requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎯 Running Pre-Commit Quality Checks${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Function to check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ Not in frontend directory. Please run from frontend/${NC}"
        exit 1
    fi
}

# Function to run a command and handle its output
run_check() {
    local name="$1"
    local command="$2"
    local fix_command="$3"
    
    echo -e "${BLUE}🔍 Running $name...${NC}"
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name passed${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $name failed${NC}"
        
        if [ -n "$fix_command" ]; then
            echo -e "${BLUE}🔧 Attempting to auto-fix...${NC}"
            eval "$fix_command"
            
            # Re-run the original check
            if eval "$command" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ $name fixed and passed${NC}"
                return 0
            else
                echo -e "${RED}❌ $name still failing after auto-fix${NC}"
                echo -e "${YELLOW}📋 Running command to show issues:${NC}"
                eval "$command"
                return 1
            fi
        else
            echo -e "${RED}❌ $name failed - no auto-fix available${NC}"
            echo -e "${YELLOW}📋 Running command to show issues:${NC}"
            eval "$command"
            return 1
        fi
    fi
}

# Change to frontend directory if not already there
if [ -f "frontend/package.json" ]; then
    cd frontend
fi

check_directory

echo -e "${BLUE}📁 Working in: $(pwd)${NC}"
echo ""

# Initialize failure flag
FAILED=0

# 1. TypeScript Type Checking
if ! run_check "TypeScript Type Check" "npm run type-check" ""; then
    FAILED=1
fi

echo ""

# 2. ESLint
if ! run_check "ESLint" "npm run lint" "npm run lint:fix"; then
    FAILED=1
fi

echo ""

# 3. Build Test
if ! run_check "Production Build" "npm run build:prod" ""; then
    FAILED=1
fi

echo ""

# Summary
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Code is ready for commit.${NC}"
    echo -e "${GREEN}✅ TypeScript: PASS${NC}"
    echo -e "${GREEN}✅ ESLint: PASS${NC}"
    echo -e "${GREEN}✅ Build: PASS${NC}"
    echo ""
    echo -e "${BLUE}🚀 Your code meets enterprise standards!${NC}"
    exit 0
else
    echo -e "${RED}❌ Pre-commit checks failed!${NC}"
    echo ""
    echo -e "${YELLOW}📋 To fix issues manually:${NC}"
    echo -e "   ${YELLOW}npm run type-check${NC}  - Check TypeScript errors"
    echo -e "   ${YELLOW}npm run lint:fix${NC}    - Fix linting issues"
    echo -e "   ${YELLOW}npm run validate${NC}    - Run full validation"
    echo ""
    echo -e "${RED}🚫 Please fix all issues before committing.${NC}"
    exit 1
fi