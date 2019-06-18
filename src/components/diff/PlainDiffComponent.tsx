import { IThemeManager } from "@jupyterlab/apputils";
import * as d3 from "d3-color";
import * as monaco from "monaco-editor";
import * as React from "react";

export interface IPlainDiffComponentState {}

export interface IPlainDiffComponentProps {
  id: string;
  extension: string;
  baseValue: string;
  headValue: string;
  themeManager: IThemeManager;
}

export class PlainDiffComponent extends React.Component<
  IPlainDiffComponentProps,
  IPlainDiffComponentState
> {
  constructor(props: IPlainDiffComponentProps) {
    super(props);
  }

  private getLanguage(ext: string): string {
    const langs = monaco.languages.getLanguages();
    for (let lang of langs) {
      if (lang["extensions"].indexOf(ext) !== -1) {
        if (lang["mimetypes"] != null && lang["mimetypes"].length > 0) {
          return lang["mimetypes"][0];
        } else {
          return lang["id"];
        }
      }
    }
    return "text/plain";
  }

  private getVariableHex(varname: string): string {
    return d3.color(
      getComputedStyle(document.body)
        .getPropertyValue(varname)
        .trim()
    ).hex();
  }

  private updateTheme() {
    
    let isLight: boolean = this.props.themeManager.isLight(
      this.props.themeManager.theme
    );
    monaco.editor.defineTheme("PlainDiffComponent", {
      base: isLight ? "vs" : "vs-dark",
      inherit: true,
      colors: {
        "editor.background": this.getVariableHex("--jp-layout-color1"),
        "editor.lineHighlightBorder": this.getVariableHex("--jp-layout-color1"),
        "editorLineNumber.foreground": this.getVariableHex("--jp-ui-font-color2"),
        "editorGutter.background": this.getVariableHex("--jp-layout-color1"),
        "diffEditor.insertedTextBackground": "#C9F3C24D", // #80
        "diffEditor.removedTextBackground": "#FF96964D"
      },
      rules: []
    });
  }

  componentDidMount() {
    // automaticLayout may not be optimal, see https://github.com/Microsoft/monaco-editor/issues/28
    // Perhaps add div resize listener? See http://marcj.github.io/css-element-queries/
    const options: monaco.editor.IDiffEditorConstructionOptions = {
      readOnly: true,
      selectionHighlight: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      renderLineHighlight: "gutter"
      // renderSideBySide: false
    };

    const language = this.getLanguage(this.props.extension);
    let baseModel = monaco.editor.createModel(this.props.baseValue, language);
    let headModel = monaco.editor.createModel(this.props.headValue, language);
    this.updateTheme();
    monaco.editor.setTheme("PlainDiffComponent");

    let diffEditor = monaco.editor.createDiffEditor(
      document.getElementById(`monacocontainer-${this.props.id}`),
      options
    );
    diffEditor.setModel({
      original: baseModel,
      modified: headModel
    });

    this.props.themeManager.themeChanged.connect(() => this.updateTheme());
  }

  render() {
    return (
      <div
        id={`monacocontainer-${this.props.id}`}
        style={{ height: "100%", width: "100%" }}
      />
    );
  }
}
