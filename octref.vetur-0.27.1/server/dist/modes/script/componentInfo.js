"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDocumentation = exports.getClassDecoratorArgumentType = exports.isClassType = exports.getLastChild = exports.getDefaultExportNode = exports.analyzeDefaultExportExpr = exports.getComponentInfo = void 0;
const childComponents_1 = require("./childComponents");
function getComponentInfo(tsModule, service, fileFsPath, config) {
    const program = service.getProgram();
    if (!program) {
        return undefined;
    }
    const sourceFile = program.getSourceFile(fileFsPath);
    if (!sourceFile) {
        return undefined;
    }
    const checker = program.getTypeChecker();
    const defaultExportNode = getDefaultExportNode(tsModule, sourceFile);
    if (!defaultExportNode) {
        return undefined;
    }
    const vueFileInfo = analyzeDefaultExportExpr(tsModule, defaultExportNode, checker);
    const defaultExportType = checker.getTypeAtLocation(defaultExportNode);
    const internalChildComponents = childComponents_1.getChildComponents(tsModule, defaultExportType, checker, config.vetur.completion.tagCasing);
    if (internalChildComponents) {
        const childComponents = [];
        internalChildComponents.forEach(c => {
            childComponents.push({
                name: c.name,
                documentation: c.documentation,
                definition: c.definition,
                info: c.defaultExportNode ? analyzeDefaultExportExpr(tsModule, c.defaultExportNode, checker) : undefined
            });
        });
        vueFileInfo.componentInfo.childComponents = childComponents;
    }
    return vueFileInfo;
}
exports.getComponentInfo = getComponentInfo;
function analyzeDefaultExportExpr(tsModule, defaultExportNode, checker) {
    const defaultExportType = checker.getTypeAtLocation(defaultExportNode);
    const props = getProps(tsModule, defaultExportType, checker);
    const data = getData(tsModule, defaultExportType, checker);
    const computed = getComputed(tsModule, defaultExportType, checker);
    const methods = getMethods(tsModule, defaultExportType, checker);
    return {
        componentInfo: {
            props,
            data,
            computed,
            methods
        }
    };
}
exports.analyzeDefaultExportExpr = analyzeDefaultExportExpr;
function getDefaultExportNode(tsModule, sourceFile) {
    const exportStmts = sourceFile.statements.filter(st => st.kind === tsModule.SyntaxKind.ExportAssignment || st.kind === tsModule.SyntaxKind.ClassDeclaration);
    if (exportStmts.length === 0) {
        return undefined;
    }
    const exportNode = exportStmts[0].kind === tsModule.SyntaxKind.ExportAssignment
        ? exportStmts[0].expression
        : exportStmts[0];
    return getNodeFromExportNode(tsModule, exportNode);
}
exports.getDefaultExportNode = getDefaultExportNode;
function getProps(tsModule, defaultExportType, checker) {
    const result = getClassAndObjectInfo(tsModule, defaultExportType, checker, getClassProps, getObjectProps);
    return result.length === 0 ? undefined : result;
    function getPropValidatorInfo(propertyValue) {
        var _a, _b, _c, _d;
        if (!propertyValue || !tsModule.isObjectLiteralExpression(propertyValue)) {
            return { hasObjectValidator: false, required: true };
        }
        const propertyValueSymbol = checker.getTypeAtLocation(propertyValue).symbol;
        const requiredValue = (_b = (_a = propertyValueSymbol === null || propertyValueSymbol === void 0 ? void 0 : propertyValueSymbol.members) === null || _a === void 0 ? void 0 : _a.get('required')) === null || _b === void 0 ? void 0 : _b.valueDeclaration;
        const defaultValue = (_d = (_c = propertyValueSymbol === null || propertyValueSymbol === void 0 ? void 0 : propertyValueSymbol.members) === null || _c === void 0 ? void 0 : _c.get('default')) === null || _d === void 0 ? void 0 : _d.valueDeclaration;
        if (!requiredValue && !defaultValue) {
            return { hasObjectValidator: false, required: true };
        }
        const required = Boolean(requiredValue &&
            tsModule.isPropertyAssignment(requiredValue) &&
            (requiredValue === null || requiredValue === void 0 ? void 0 : requiredValue.initializer.kind) === tsModule.SyntaxKind.TrueKeyword);
        return { hasObjectValidator: true, required };
    }
    function getClassProps(type) {
        const propDecoratorNames = ['Prop', 'Model', 'PropSync'];
        const propsSymbols = type
            .getProperties()
            .filter(property => getPropertyDecoratorNames(property, tsModule.SyntaxKind.PropertyDeclaration).some(decoratorName => propDecoratorNames.includes(decoratorName)));
        if (propsSymbols.length === 0) {
            return undefined;
        }
        return propsSymbols.map(propSymbol => {
            var _a, _b;
            const prop = propSymbol.valueDeclaration;
            const decoratorExpr = (_b = (_a = prop.decorators) === null || _a === void 0 ? void 0 : _a.find(decorator => tsModule.isCallExpression(decorator.expression)
                ? propDecoratorNames.includes(decorator.expression.expression.getText())
                : false)) === null || _b === void 0 ? void 0 : _b.expression;
            const decoratorName = decoratorExpr.expression.getText();
            const [firstNode, secondNode] = decoratorExpr.arguments;
            if (decoratorName === 'PropSync' && tsModule.isStringLiteral(firstNode)) {
                return Object.assign(Object.assign({ name: firstNode.text }, getPropValidatorInfo(secondNode)), { documentation: buildDocumentation(tsModule, propSymbol, checker) });
            }
            return Object.assign(Object.assign({ name: propSymbol.name }, getPropValidatorInfo(decoratorName === 'Model' ? secondNode : firstNode)), { documentation: buildDocumentation(tsModule, propSymbol, checker) });
        });
    }
    function getObjectProps(type) {
        const propsSymbol = checker.getPropertyOfType(type, 'props');
        if (!propsSymbol || !propsSymbol.valueDeclaration) {
            return undefined;
        }
        const propsDeclaration = getLastChild(propsSymbol.valueDeclaration);
        if (!propsDeclaration) {
            return undefined;
        }
        /**
         * Plain array props like `props: ['foo', 'bar']`
         */
        if (propsDeclaration.kind === tsModule.SyntaxKind.ArrayLiteralExpression) {
            return propsDeclaration.elements
                .filter(expr => expr.kind === tsModule.SyntaxKind.StringLiteral)
                .map(expr => {
                return {
                    name: expr.text,
                    hasObjectValidator: false,
                    required: true,
                    documentation: `\`\`\`js\n${formatJSLikeDocumentation(propsDeclaration.parent.getFullText().trim())}\n\`\`\`\n`
                };
            });
        }
        /**
         * Object literal props like
         * ```
         * {
         *   props: {
         *     foo: { type: Boolean, default: true },
         *     bar: { type: String, default: 'bar' },
         *     car: String
         *   }
         * }
         * ```
         */
        if (propsDeclaration.kind === tsModule.SyntaxKind.ObjectLiteralExpression) {
            const propsType = checker.getTypeOfSymbolAtLocation(propsSymbol, propsDeclaration);
            return checker.getPropertiesOfType(propsType).map(s => {
                const status = tsModule.isPropertyAssignment(s.valueDeclaration)
                    ? getPropValidatorInfo(s.valueDeclaration.initializer)
                    : { hasObjectValidator: false, required: true };
                return Object.assign(Object.assign({ name: s.name }, status), { documentation: buildDocumentation(tsModule, s, checker) });
            });
        }
        return undefined;
    }
}
/**
 * In SFC, data can only be a function
 * ```
 * {
 *   data() {
 *     return {
 *        foo: true,
 *        bar: 'bar'
 *     }
 *   }
 * }
 * ```
 */
function getData(tsModule, defaultExportType, checker) {
    const result = getClassAndObjectInfo(tsModule, defaultExportType, checker, getClassData, getObjectData);
    return result.length === 0 ? undefined : result;
    function getClassData(type) {
        const noDataDecoratorNames = ['Prop', 'Model', 'Provide', 'ProvideReactive', 'Ref'];
        const dataSymbols = type
            .getProperties()
            .filter(property => !getPropertyDecoratorNames(property, tsModule.SyntaxKind.PropertyDeclaration).some(decoratorName => noDataDecoratorNames.includes(decoratorName)) &&
            !property.name.startsWith('_') &&
            !property.name.startsWith('$'));
        if (dataSymbols.length === 0) {
            return undefined;
        }
        return dataSymbols.map(data => {
            return {
                name: data.name,
                documentation: buildDocumentation(tsModule, data, checker)
            };
        });
    }
    function getObjectData(type) {
        const dataSymbol = checker.getPropertyOfType(type, 'data');
        if (!dataSymbol || !dataSymbol.valueDeclaration) {
            return undefined;
        }
        const dataType = checker.getTypeOfSymbolAtLocation(dataSymbol, dataSymbol.valueDeclaration);
        const dataSignatures = dataType.getCallSignatures();
        if (dataSignatures.length === 0) {
            return undefined;
        }
        const dataReturnTypeProperties = checker.getReturnTypeOfSignature(dataSignatures[0]);
        return dataReturnTypeProperties.getProperties().map(s => {
            return {
                name: s.name,
                documentation: buildDocumentation(tsModule, s, checker)
            };
        });
    }
}
function getComputed(tsModule, defaultExportType, checker) {
    const result = getClassAndObjectInfo(tsModule, defaultExportType, checker, getClassComputed, getObjectComputed);
    return result.length === 0 ? undefined : result;
    function getClassComputed(type) {
        const getAccessorSymbols = type
            .getProperties()
            .filter(property => property.valueDeclaration.kind === tsModule.SyntaxKind.GetAccessor);
        const setAccessorSymbols = defaultExportType
            .getProperties()
            .filter(property => property.valueDeclaration.kind === tsModule.SyntaxKind.SetAccessor);
        if (getAccessorSymbols.length === 0) {
            return undefined;
        }
        return getAccessorSymbols.map(computed => {
            const setComputed = setAccessorSymbols.find(setAccessor => setAccessor.name === computed.name);
            return {
                name: computed.name,
                documentation: buildDocumentation(tsModule, computed, checker) +
                    (setComputed !== undefined ? buildDocumentation(tsModule, setComputed, checker) : '')
            };
        });
    }
    function getObjectComputed(type) {
        const computedSymbol = checker.getPropertyOfType(type, 'computed');
        if (!computedSymbol || !computedSymbol.valueDeclaration) {
            return undefined;
        }
        const computedDeclaration = getLastChild(computedSymbol.valueDeclaration);
        if (!computedDeclaration) {
            return undefined;
        }
        if (computedDeclaration.kind === tsModule.SyntaxKind.ObjectLiteralExpression) {
            const computedType = checker.getTypeOfSymbolAtLocation(computedSymbol, computedDeclaration);
            return checker.getPropertiesOfType(computedType).map(s => {
                return {
                    name: s.name,
                    documentation: buildDocumentation(tsModule, s, checker)
                };
            });
        }
    }
}
function isInternalHook(methodName) {
    const $internalHooks = [
        'data',
        'beforeCreate',
        'created',
        'beforeMount',
        'mounted',
        'beforeDestroy',
        'destroyed',
        'beforeUpdate',
        'updated',
        'activated',
        'deactivated',
        'render',
        'errorCaptured',
        'serverPrefetch' // 2.6
    ];
    return $internalHooks.includes(methodName);
}
function getMethods(tsModule, defaultExportType, checker) {
    const result = getClassAndObjectInfo(tsModule, defaultExportType, checker, getClassMethods, getObjectMethods);
    return result.length === 0 ? undefined : result;
    function getClassMethods(type) {
        const methodSymbols = type
            .getProperties()
            .filter(property => !getPropertyDecoratorNames(property, tsModule.SyntaxKind.MethodDeclaration).some(decoratorName => decoratorName === 'Watch') && !isInternalHook(property.name));
        if (methodSymbols.length === 0) {
            return undefined;
        }
        return methodSymbols.map(method => {
            return {
                name: method.name,
                documentation: buildDocumentation(tsModule, method, checker)
            };
        });
    }
    function getObjectMethods(type) {
        const methodsSymbol = checker.getPropertyOfType(type, 'methods');
        if (!methodsSymbol || !methodsSymbol.valueDeclaration) {
            return undefined;
        }
        const methodsDeclaration = getLastChild(methodsSymbol.valueDeclaration);
        if (!methodsDeclaration) {
            return undefined;
        }
        if (methodsDeclaration.kind === tsModule.SyntaxKind.ObjectLiteralExpression) {
            const methodsType = checker.getTypeOfSymbolAtLocation(methodsSymbol, methodsDeclaration);
            return checker.getPropertiesOfType(methodsType).map(s => {
                return {
                    name: s.name,
                    documentation: buildDocumentation(tsModule, s, checker)
                };
            });
        }
    }
}
function getNodeFromExportNode(tsModule, exportExpr) {
    switch (exportExpr.kind) {
        case tsModule.SyntaxKind.CallExpression:
            // Vue.extend or synthetic __vueEditorBridge
            return exportExpr.arguments[0];
        case tsModule.SyntaxKind.ObjectLiteralExpression:
            return exportExpr;
        case tsModule.SyntaxKind.ClassDeclaration:
            return exportExpr;
    }
    return undefined;
}
function getLastChild(d) {
    const children = d.getChildren();
    if (children.length === 0) {
        return undefined;
    }
    return children[children.length - 1];
}
exports.getLastChild = getLastChild;
function isClassType(tsModule, type) {
    if (type.isClass === undefined) {
        return !!((type.flags & tsModule.TypeFlags.Object ? type.objectFlags : 0) & tsModule.ObjectFlags.Class);
    }
    else {
        return type.isClass();
    }
}
exports.isClassType = isClassType;
function getClassDecoratorArgumentType(tsModule, defaultExportNode, checker) {
    var _a;
    const decorators = defaultExportNode.symbol.valueDeclaration.decorators;
    if (!decorators || decorators.length === 0) {
        return undefined;
    }
    if (!tsModule.isCallExpression(decorators === null || decorators === void 0 ? void 0 : decorators[0].expression)) {
        return undefined;
    }
    const decoratorArguments = (_a = decorators === null || decorators === void 0 ? void 0 : decorators[0].expression) === null || _a === void 0 ? void 0 : _a.arguments;
    if (!decoratorArguments || decoratorArguments.length === 0) {
        return undefined;
    }
    return checker.getTypeAtLocation(decoratorArguments[0]);
}
exports.getClassDecoratorArgumentType = getClassDecoratorArgumentType;
function getClassAndObjectInfo(tsModule, defaultExportType, checker, getClassResult, getObjectResult) {
    const result = [];
    if (isClassType(tsModule, defaultExportType)) {
        result.push.apply(result, getClassResult(defaultExportType) || []);
        const decoratorArgumentType = getClassDecoratorArgumentType(tsModule, defaultExportType, checker);
        if (decoratorArgumentType) {
            result.push.apply(result, getObjectResult(decoratorArgumentType) || []);
        }
    }
    else {
        result.push.apply(result, getObjectResult(defaultExportType) || []);
    }
    return result;
}
function getPropertyDecoratorNames(property, checkSyntaxKind) {
    var _a;
    if (property.valueDeclaration.kind !== checkSyntaxKind) {
        return [];
    }
    const decorators = (_a = property === null || property === void 0 ? void 0 : property.valueDeclaration) === null || _a === void 0 ? void 0 : _a.decorators;
    if (decorators === undefined) {
        return [];
    }
    return decorators
        .map(decorator => decorator.expression)
        .filter(decoratorExpression => decoratorExpression.expression !== undefined)
        .map(decoratorExpression => decoratorExpression.expression.getText());
}
function buildDocumentation(tsModule, s, checker) {
    let documentation = s
        .getDocumentationComment(checker)
        .map(d => d.text)
        .join('\n');
    documentation += '\n';
    if (s.valueDeclaration) {
        documentation += `\`\`\`js\n${formatJSLikeDocumentation(s.valueDeclaration.getText())}\n\`\`\`\n`;
    }
    return documentation;
}
exports.buildDocumentation = buildDocumentation;
function formatJSLikeDocumentation(src) {
    const segments = src.split('\n');
    if (segments.length === 1) {
        return src;
    }
    const spacesToDeindent = segments[segments.length - 1].search(/\S/);
    return (segments[0] +
        '\n' +
        segments
            .slice(1)
            .map(s => s.slice(spacesToDeindent))
            .join('\n'));
}
//# sourceMappingURL=componentInfo.js.map