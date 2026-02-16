#!/bin/bash

# Environment Variables Verification Script
# This script checks if all required environment variables are set

echo "🔍 Checking Environment Variables Setup..."
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file exists"
else
    echo "❌ .env file not found!"
    exit 1
fi

# Check if app.config.js exists
if [ -f "app.config.js" ]; then
    echo "✅ app.config.js exists"
else
    echo "❌ app.config.js not found!"
    exit 1
fi

echo ""
echo "📋 Checking required environment variables in .env:"
echo ""

# Array of required environment variables
required_vars=(
    "FIREBASE_API_KEY"
    "FIREBASE_AUTH_DOMAIN"
    "FIREBASE_PROJECT_ID"
    "FIREBASE_STORAGE_BUCKET"
    "FIREBASE_MESSAGING_SENDER_ID"
    "FIREBASE_APP_ID"
    "FIREBASE_MEASUREMENT_ID"
    "GOOGLE_MAPS_API_KEY"
    "RAZORPAY_KEY_ID"
    "RAZORPAY_KEY_SECRET"
)

missing_vars=0

for var in "${required_vars[@]}"; do
    if grep -q "^${var}=" .env; then
        value=$(grep "^${var}=" .env | cut -d '=' -f2)
        if [ -n "$value" ]; then
            echo "✅ $var is set"
        else
            echo "⚠️  $var is empty"
            ((missing_vars++))
        fi
    else
        echo "❌ $var is missing"
        ((missing_vars++))
    fi
done

echo ""
echo "📦 Checking installed packages:"
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ node_modules directory exists"
    
    # Check for react-native-razorpay
    if [ -d "node_modules/react-native-razorpay" ]; then
        echo "✅ react-native-razorpay is installed"
    else
        echo "❌ react-native-razorpay is NOT installed"
        echo "   Run: yarn add react-native-razorpay"
    fi
    
    # Check for dotenv
    if [ -d "node_modules/dotenv" ]; then
        echo "✅ dotenv is installed"
    else
        echo "❌ dotenv is NOT installed"
        echo "   Run: yarn add dotenv"
    fi
else
    echo "⚠️  node_modules not found. Run: yarn install"
fi

echo ""
echo "🔐 Checking .gitignore:"
echo ""

# Check if .env is in .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore; then
        echo "✅ .env is in .gitignore"
    else
        echo "⚠️  .env is NOT in .gitignore"
        echo "   Add it to prevent committing secrets!"
    fi
else
    echo "⚠️  .gitignore file not found"
fi

echo ""
echo "📁 Checking configuration files:"
echo ""

config_files=(
    "src/config/firebaseConfig.js"
    "src/config/razorpayConfig.js"
    "src/services/razorpayService.js"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file not found"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $missing_vars -eq 0 ]; then
    echo "🎉 All environment variables are properly configured!"
    echo ""
    echo "✅ You can now start the application:"
    echo "   yarn start"
else
    echo "⚠️  Found $missing_vars missing or empty environment variable(s)"
    echo ""
    echo "📝 Please update your .env file with the missing values"
fi

echo ""
echo "📚 For more information, see:"
echo "   - ENV_SETUP.md (full documentation)"
echo "   - QUICK_REFERENCE.md (quick guide)"
echo "   - .env.example (template)"
echo ""
