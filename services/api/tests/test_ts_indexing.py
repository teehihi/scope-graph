from app.indexing.ts_parser import TypeScriptASTParser

def test_typescript_parser_extracts_symbols_and_imports():
    ts_code = """
import React, { useState, useEffect } from 'react';
import { UserService } from './services/userService';
import * as utils from './utils';

export interface UserProps {
    id: string;
    email: string;
}

export class UserProfileComponent {
    render() {
        return null;
    }
}

export const UserCard: React.FC<UserProps> = ({ id, email }) => {
    return <div>{email}</div>;
};

export async function fetchUserData(userId: string) {
    const service = new UserService();
    return service.getUser(userId);
}
"""
    result = TypeScriptASTParser.parse_code("src/components/UserCard.tsx", ts_code)
    assert result.language == "typescript"
    symbols = {s.name: s.symbol_type for s in result.symbols}
    assert "UserProps" in symbols
    assert symbols["UserProps"] == "type"
    assert "UserProfileComponent" in symbols
    assert symbols["UserProfileComponent"] == "class"
    assert "UserCard" in symbols
    assert symbols["UserCard"] == "component"
    assert "fetchUserData" in symbols
    assert symbols["fetchUserData"] == "function"

    # Check import edges
    import_targets = [e.target_file_or_module for e in result.edges if e.edge_type == "imports"]
    assert "react" in import_targets
    assert "./services/userService" in import_targets
    assert "./utils" in import_targets
